import { RequestHandler } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { env, isProduction } from '@/config/env';
import { hashToken } from '@/lib/security';
import { ApiError } from '@/utils/ApiError';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const rawToken = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;
    if (!rawToken) throw ApiError.unauthorized('Session expirée. Veuillez vous reconnecter.');
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || session.user.status !== UserStatus.ACTIVE) {
      throw ApiError.unauthorized('Session expirée. Veuillez vous reconnecter.');
    }
    req.auth = { userId: session.user.id, role: session.user.role, email: session.user.email };
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (error) { next(error); }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return next(ApiError.forbidden('Vous n’avez pas l’autorisation pour cette action.'));
    next();
  };
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    domain: env.COOKIE_DOMAIN,
    expires,
    path: '/',
  };

}
