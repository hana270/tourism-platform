import path from 'path';
import fs from 'fs/promises';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '@/config/prisma';
import { requireAuth, requireRole } from '@/middlewares/auth';
import { asyncHandler } from '@/utils/asyncHandler';
import { audit } from '@/lib/audit';

const router = Router();
const keys = { eur: 'exchange_rate_tnd_eur', usd: 'exchange_rate_tnd_usd', updatedAt: 'exchange_rate_updated_at' } as const;
const contactKeys = ['whatsappNumero', 'telephone', 'email', 'adresse', 'facebook', 'instagram'] as const;
const homeKeys = ['logo', 'nomSite', 'photoCouverture', 'titreAccueil', 'sousTitre'] as const;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } }).single('image');

async function readKeys(list: readonly string[]) { const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...list] } } }); return Object.fromEntries(rows.map((row) => [row.key, row.value])); }
async function saveKeys(values: Record<string, string | null | undefined>) { return prisma.$transaction(Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => prisma.siteSetting.upsert({ where: { key }, update: { value: value ?? '' }, create: { key, value: value ?? '' } }))); }
const contactSchema = z.object({ whatsappNumero: z.string().trim().min(5).max(40), telephone: z.string().trim().max(40).optional().nullable(), email: z.string().email().optional().or(z.literal('')).nullable(), adresse: z.string().trim().max(300).optional().nullable(), facebook: z.string().url().optional().or(z.literal('')).nullable(), instagram: z.string().url().optional().or(z.literal('')).nullable() });
const homeSchema = z.object({ logo: z.string().trim().max(500).optional().nullable(), nomSite: z.string().trim().min(2).max(100), photoCouverture: z.string().trim().max(500).optional().nullable(), titreAccueil: z.string().trim().max(180).optional().nullable(), sousTitre: z.string().trim().max(300).optional().nullable() });

router.get('/exchange-rates', asyncHandler(async (_req: Request, res: Response) => { const values = await readKeys(Object.values(keys)); res.json({ success: true, data: { base: 'TND', rates: { TND: 1, EUR: Number(values[keys.eur] ?? 0.30), USD: Number(values[keys.usd] ?? 0.33) }, updatedAt: values[keys.updatedAt] ?? null } }); }));
router.patch('/exchange-rates', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => { const input = z.object({ eur: z.coerce.number().positive(), usd: z.coerce.number().positive(), updatedAt: z.string().datetime().optional() }).parse(req.body); const updatedAt = input.updatedAt ?? new Date().toISOString(); await saveKeys({ [keys.eur]: String(input.eur), [keys.usd]: String(input.usd), [keys.updatedAt]: updatedAt }); await audit(req.auth!.userId, 'UPDATE', 'SiteSetting', keys.eur, input); res.json({ success: true, data: { base: 'TND', rates: { TND: 1, EUR: input.eur, USD: input.usd }, updatedAt } }); }));

router.get('/contact', asyncHandler(async (_req: Request, res: Response) => { const v = await readKeys(contactKeys); res.json({ success: true, data: Object.fromEntries(contactKeys.map((key) => [key, v[key] ?? ''])) }); }));
router.patch('/contact', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => { const input = contactSchema.parse(req.body); await saveKeys(input); await audit(req.auth!.userId, 'UPDATE', 'SiteContact', 'contact', { fields: Object.keys(input) }); res.json({ success: true, data: input }); }));

router.get('/homepage', asyncHandler(async (_req: Request, res: Response) => { const v = await readKeys(homeKeys); res.json({ success: true, data: Object.fromEntries(homeKeys.map((key) => [key, v[key] ?? ''])) }); }));
router.patch('/homepage', requireAuth, requireRole('ADMIN'), asyncHandler(async (req: Request, res: Response) => { const input = homeSchema.parse(req.body); await saveKeys(input); await audit(req.auth!.userId, 'UPDATE', 'HomepageSettings', 'homepage', { fields: Object.keys(input) }); res.json({ success: true, data: input }); }));
router.post('/homepage/upload', requireAuth, requireRole('ADMIN'), upload, asyncHandler(async (req: Request, res: Response) => { if (!req.file) { res.status(400).json({ success: false, message: 'Image manquante.' }); return; } const dir = path.join(process.cwd(), 'uploads', 'settings'); await fs.mkdir(dir, { recursive: true }); const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`; await sharp(req.file.buffer).rotate().resize(2400, 1400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(dir, filename)); const url = `/uploads/settings/${filename}`; await audit(req.auth!.userId, 'UPLOAD', 'HomepageSettings', 'homepage', { url }); res.status(201).json({ success: true, data: { url } }); }));

export default router;
