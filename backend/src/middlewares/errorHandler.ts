/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';

/**
 * Gestionnaire central des erreurs.
 *
 * Format de réponse (celui que lit le frontend) :
 *   { success: false, message: "…", details: [{ path: "firstName", message: "Ce champ est obligatoire." }] }
 *
 * - `path` = nom du champ du formulaire → l'erreur s'affiche sous ce champ ;
 * - `path: "form"` = erreur générale, affichée en haut du formulaire ;
 * - tous les messages sont en français ; le détail technique ne sort JAMAIS d'un 500.
 */

type Detail = { path: string; message: string };

const REQUIRED = 'Ce champ est obligatoire.';

const fail = (res: Response, status: number, message: string, details: Detail[] | null = null) =>
  res.status(status).json({ success: false, message, details });

/** Traduit une erreur de validation zod (v3 ou v4) en phrase claire. */
function zodMessage(issue: any): string {
  const kind = issue.type ?? issue.origin; // v3 : type — v4 : origin
  const format = issue.validation ?? issue.format;

  switch (issue.code) {
    case 'invalid_type': {
      const missing = issue.received === 'undefined' || issue.received === 'null' || issue.input === undefined;
      return missing ? REQUIRED : 'Valeur invalide pour ce champ.';
    }
    case 'too_small':
      if (kind === 'string') return Number(issue.minimum) <= 1 ? REQUIRED : `Minimum ${issue.minimum} caractères.`;
      if (kind === 'number') return `La valeur doit être supérieure ou égale à ${issue.minimum}.`;
      return issue.message;
    case 'too_big':
      if (kind === 'string') return `Maximum ${issue.maximum} caractères.`;
      if (kind === 'number') return `La valeur ne doit pas dépasser ${issue.maximum}.`;
      return issue.message;
    case 'invalid_string':
    case 'invalid_format':
      if (format === 'email') return 'Adresse e-mail invalide.';
      if (format === 'url') return 'Adresse web invalide.';
      return 'Format invalide.';
    case 'invalid_enum_value':
    case 'invalid_value':
      return 'Valeur non autorisée.';
    default:
      return issue.message || 'Valeur invalide.'; // 'custom' : message écrit dans le schéma
  }
}

/** Nom du champ concerné par une contrainte Prisma (ex. "User_email_key" → "email"). */
function prismaField(target: unknown): string {
  if (Array.isArray(target) && target.length) return String(target[0]);
  if (typeof target === 'string') return target.match(/_([^_]+)_key$/)?.[1] ?? target;
  return 'form';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1. Erreur volontaire du code (throw new ApiError(...)).
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details ?? null,
    });
  }

  // 2. Champs invalides (schéma zod).
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.map(String).join('.') || 'form',
      message: zodMessage(issue),
    }));
    return fail(res, 400, 'Certains champs sont invalides. Corrigez-les puis réessayez.', details);
  }

  // 3. Prisma a refusé les données.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const meta: any = err.meta ?? {};

    switch (err.code) {
      case 'P2002': // valeur déjà utilisée (contrainte unique)
        return fail(res, 409, 'Cette valeur existe déjà.', [
          { path: prismaField(meta.target), message: 'Cette valeur est déjà utilisée.' },
        ]);
      case 'P2011': // champ obligatoire reçu vide (NULL)
      case 'P2012': // valeur obligatoire manquante
        return fail(res, 400, 'Certains champs obligatoires sont vides.', [
          { path: prismaField(meta.constraint ?? meta.path), message: REQUIRED },
        ]);
      case 'P2000': // texte trop long pour la colonne
        return fail(res, 400, 'Une valeur est trop longue.', [
          { path: prismaField(meta.column_name), message: 'Cette valeur est trop longue.' },
        ]);
      case 'P2003': // lien avec un autre élément
        return fail(res, 409, 'Opération impossible : cet élément est lié à d’autres données.');
      case 'P2025':
        return fail(res, 404, 'Élément introuvable.');
    }
  }

  // 4. Données incomplètes envoyées à Prisma (ex. « Argument `firstName` is missing »).
  //    C'était la cause des « erreur inconnue 500 » quand un champ n'était pas rempli.
  if (err instanceof Prisma.PrismaClientValidationError) {
    const missing = [...err.message.matchAll(/Argument `([\w.]+)`(?: is missing| must not be null)/g)];
    const details = missing.map((m) => ({ path: m[1], message: REQUIRED }));
    // eslint-disable-next-line no-console
    console.error('⚠️ Prisma validation error:', err.message);
    return fail(res, 400, 'Certains champs obligatoires sont manquants ou invalides.', details.length ? details : null);
  }

  // 5. JSON illisible / fichier refusé.
  if (err instanceof SyntaxError && 'body' in err) {
    return fail(res, 400, 'Les données envoyées sont illisibles. Rechargez la page puis réessayez.');
  }
  if ((err as any)?.name === 'MulterError') {
    return (err as any).code === 'LIMIT_FILE_SIZE'
      ? fail(res, 413, 'Le fichier est trop volumineux.')
      : fail(res, 400, 'Le fichier envoyé est invalide.');
  }

  // 6. Vraie erreur inattendue : détail dans le terminal, message propre pour l'utilisateur.
  // eslint-disable-next-line no-console
  console.error('🔥 Unhandled error:', err);

  return res.status(500).json({
    success: false,
    message: 'Une erreur est survenue de notre côté. Réessayez dans un instant.',
    ...(env.NODE_ENV === 'development' ? { stack: (err as Error)?.stack } : {}),
  });
}