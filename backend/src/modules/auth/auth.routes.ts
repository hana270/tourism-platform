import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { env } from '@/config/env';
import { addDays, createOpaqueToken, hashToken } from '@/lib/security';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole, sessionCookieOptions } from '@/middlewares/auth';
import { sendMail } from '@/lib/mailer';
import { passwordChangedEmail, resetPasswordEmail } from '@/lib/email-templates';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { uploadObject, deleteStoredUrls } from '@/lib/storage';


const router = Router();
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
  _req: import("express").Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) =>
  cb(
    null,
    ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
  ),

}).single('image');
const credentials = z.object({ login: z.string().trim().min(3).max(160), password: z.string().min(8).max(128) });
/** Politique des nouveaux mots de passe : 10 caractères minimum, avec au moins une lettre et un chiffre. */
const strongPassword = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères.')
  .max(128)
  .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre.')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.');
const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message } });
const loginLimiter = limiter(15 * 60 * 1000, 10, 'Trop de tentatives de connexion. Réessayez dans 15 minutes.');
const forgotLimiter = limiter(60 * 60 * 1000, 5, 'Trop de demandes. Réessayez dans une heure.');
const resetLimiter = limiter(60 * 60 * 1000, 10, 'Trop de tentatives. Réessayez dans une heure.');
const RESET_MINUTES = 60;
/** Hash factice : évite de révéler par le temps de réponse qu'un compte n'existe pas. */
const DUMMY_HASH = '$2a$12$TURmPvUAQI/6YaU4es4RZeya399PSWOnM49LCSUq4ErDXnjb6f5Hi';
const appUrl = (path: string) => `${env.APP_BASE_URL.replace(/\/$/, '')}/fr${path}`;
const registerSchema = z.object({ email: z.string().email().transform((v) => v.toLowerCase().trim()), password: strongPassword, firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80) });
const resetSchema = z.object({ token: z.string().min(20).max(200), password: strongPassword });
const cookie = (res: Response, token: string, expires: Date) => res.cookie(env.SESSION_COOKIE_NAME, token, sessionCookieOptions(expires));

async function createSession(userId: string, res: Response): Promise<void> {
  const raw = createOpaqueToken();
  const expires = addDays(env.SESSION_DAYS);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(raw), expiresAt: expires } });
  cookie(res, raw, expires);
}

/** Création d'un compte équipe : réservée à l'administrateur connecté (aucune inscription publique). */
router.post('/register', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw ApiError.conflict('Cette adresse e-mail est déjà utilisée.');
  const user = await prisma.user.create({ data: { ...input, passwordHash: await bcrypt.hash(input.password, 12), status: 'ACTIVE', emailVerifiedAt: new Date() }, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
  res.status(201).json({ success: true, data: user, message: 'Compte créé.' });
}));

router.get('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const token = z.string().min(20).parse(req.query.token);
  const record = await prisma.emailToken.findFirst({ where: { tokenHash: hashToken(token), type: 'VERIFY_EMAIL', usedAt: null, expiresAt: { gt: new Date() } } });
  if (!record) throw ApiError.badRequest('Lien de vérification invalide ou expiré.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  res.json({ success: true, message: 'E-mail vérifié. Vous pouvez vous connecter.' });
}));

router.post('/login', loginLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = credentials.parse(req.body);
  const login = input.login.toLowerCase().trim();
  const user = login.includes('@')
    ? await prisma.user.findUnique({ where: { email: login } })
    : await prisma.user.findUnique({ where: { username: login } });
  const valid = await bcrypt.compare(input.password, user ? user.passwordHash : DUMMY_HASH) && !!user;
  if (!user || !valid) throw ApiError.unauthorized('E-mail ou mot de passe incorrect.');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('Vérifiez votre adresse e-mail avant de vous connecter.');
  await createSession(user.id, res);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json({ success: true, data: { id: user.id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName, profilePhoto: user.profilePhoto, role: user.role, lastLoginAt: user.lastLoginAt } });
}));

router.post('/forgot-password', forgotLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().email().transform((v) => v.toLowerCase().trim()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === 'ACTIVE') {
    const raw = createOpaqueToken();
    await prisma.$transaction([
      // Un seul lien valide à la fois : les anciens sont invalidés.
      prisma.emailToken.updateMany({ where: { userId: user.id, type: 'RESET_PASSWORD', usedAt: null }, data: { usedAt: new Date() } }),
      prisma.emailToken.create({ data: { userId: user.id, tokenHash: hashToken(raw), type: 'RESET_PASSWORD', expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } }),
    ]);
    const url = appUrl(`/reset-password?token=${raw}`);
    const mail = resetPasswordEmail({ name: user.firstName, url, minutes: RESET_MINUTES });
    // Envoi sans attendre : la durée de réponse ne révèle pas si le compte existe.
    void sendMail({ to: user.email, ...mail, devLink: url }).then((r) => { if (!r.sent) console.error('Reset e-mail not sent:', r.reason); });
  }
  res.json({ success: true, message: 'Si cette adresse correspond à un compte, un e-mail vient d’être envoyé.' });
}));

router.get('/reset-password/check', resetLimiter, asyncHandler(async (req: Request, res: Response) => {
  const token = z.string().min(20).max(200).parse(req.query.token);
  const record = await prisma.emailToken.findFirst({ where: { tokenHash: hashToken(token), type: 'RESET_PASSWORD', usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (!record) throw ApiError.badRequest('Ce lien est invalide ou a expiré. Demandez-en un nouveau.');
  res.json({ success: true });
}));

router.post('/reset-password', resetLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = resetSchema.parse(req.body);
  const record = await prisma.emailToken.findFirst({ where: { tokenHash: hashToken(input.token), type: 'RESET_PASSWORD', usedAt: null, expiresAt: { gt: new Date() } } });
  if (!record) throw ApiError.badRequest('Lien de réinitialisation invalide ou expiré.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(input.password, 12) } }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  const owner = await prisma.user.findUnique({ where: { id: record.userId }, select: { email: true, firstName: true } });
  if (owner) {
    const mail = passwordChangedEmail({ name: owner.firstName, loginUrl: appUrl('/login') });
    void sendMail({ to: owner.email, ...mail }).catch(() => undefined);
  }
  res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
}));

router.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;
  if (raw) await prisma.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  res.clearCookie(env.SESSION_COOKIE_NAME, sessionCookieOptions(new Date(0)));
  res.json({ success: true, message: 'Déconnexion réussie.' });
}));

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { id: true, email: true, username: true, firstName: true, lastName: true, profilePhoto: true, role: true, lastLoginAt: true } });
  res.json({ success: true, data: user });
}));


router.post('/change-password', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const data = z.object({
    currentPassword: z.string().min(1),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1).max(128),
  }).refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Les mots de passe ne correspondent pas.' }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw ApiError.unauthorized('Mot de passe actuel incorrect.');
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12) } }),
  ]);
  res.json({ success: true, message: 'Mot de passe modifié.' });
}));

router.patch('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const input = z.object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional().or(z.literal('')),
    email: z.string().email().transform((v) => v.toLowerCase().trim()).optional(),
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    currentPassword: z.string().optional(),
  }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) throw ApiError.notFound('Compte introuvable.');
  const changingSensitive = (input.email && input.email !== user.email) || (input.username !== undefined && input.username !== (user.username ?? ''));
  if (changingSensitive && (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.passwordHash)))) {
    throw ApiError.unauthorized('Le mot de passe actuel est requis pour modifier l’e-mail ou le nom d’utilisateur.');
  }
  if (input.email && input.email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw ApiError.conflict('Cette adresse e-mail est déjà utilisée.');
  }
  const username = input.username?.trim() || null;
  if (username && username !== user.username) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) throw ApiError.conflict('Ce nom d’utilisateur est déjà utilisé.');
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.username !== undefined ? { username } : {}),
    },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, profilePhoto: true, role: true, lastLoginAt: true },
  });
  res.json({ success: true, data: updated });
}));

router.post('/me/photo', requireAuth, profileUpload, asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('Image de profil manquante.');
  const webp = await sharp(req.file.buffer).rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 86 }).toBuffer();
  const url = await uploadObject(`profiles/${req.auth!.userId}-${Date.now()}.webp`, webp);
  const current = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { profilePhoto: true } });
  await prisma.user.update({ where: { id: req.auth!.userId }, data: { profilePhoto: url } });
  await deleteStoredUrls([current?.profilePhoto]);
  res.status(201).json({ success: true, data: { profilePhoto: url } });
}));

export default router;
