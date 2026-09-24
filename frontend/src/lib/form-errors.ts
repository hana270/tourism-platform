import axios from 'axios';

/**
 * Gestion professionnelle des erreurs de formulaire.
 *
 * - `extractFieldErrors` lit la réponse du serveur (400/409/422) et donne
 *   { champ: "message clair" } pour afficher l'erreur SOUS chaque champ.
 * - `friendlyErrorMessage` produit un message lisible pour tout le reste.
 *   Le détail technique d'une erreur 500 n'est JAMAIS montré à l'administrateur.
 * - `isEmail`, `focusFirstError` : contrôles côté navigateur, avant l'envoi.
 */

export type FieldErrors = Record<string, string>;

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  403: "Vous n'avez pas l'autorisation d'effectuer cette action.",
  404: "L'élément demandé est introuvable.",
  409: 'Cette valeur existe déjà.',
  413: 'Le fichier envoyé est trop volumineux.',
  422: 'Certains champs sont invalides. Corrigez les champs signalés puis réessayez.',
  429: 'Trop de tentatives. Patientez quelques instants avant de réessayer.',
  500: 'Une erreur est survenue de notre côté. Réessayez dans un instant ; si le problème persiste, contactez le support.',
};

/** Messages techniques qu'on ne montre jamais tels quels. */
const GENERIC_MESSAGE = /unknown|inconnu|internal server|server error|something went wrong|erreur interne|failed/i;

/** Traduit les messages de validation anglais les plus courants (zod, express-validator…). */
function toFrench(message: string): string {
  const m = message.trim();
  if (/^required$|is required|received (undefined|null)|must not be empty|cannot be empty|should not be empty|is not allowed to be empty/i.test(m))
    return 'Ce champ est obligatoire.';
  if (/invalid email|valid email|email must be/i.test(m)) return 'Adresse e-mail invalide.';
  const min = m.match(/at least (\d+) character/i);
  if (min) return `Minimum ${min[1]} caractères.`;
  const max = m.match(/(?:at most|no more than|less than or equal to) (\d+) character/i);
  if (max) return `Maximum ${max[1]} caractères.`;
  if (/already (exists|used|taken)|unique constraint|duplicate/i.test(m)) return 'Cette valeur est déjà utilisée.';
  if (/passwords? (do not|don't|does not) match/i.test(m)) return 'Les deux mots de passe ne sont pas identiques.';
  return m;
}

/** "body.firstName" → "firstName" ; ["body","photos",0,"url"] → "photos.0.url" ; vide → "form". */
function normalizePath(path: unknown): string {
  const raw = Array.isArray(path) ? path.join('.') : String(path ?? '');
  return raw.replace(/^(body|query|params)\./, '') || 'form';
}

/**
 * Lit les erreurs par champ envoyées par le serveur.
 * Formats acceptés : details/errors/issues sous forme de liste
 * [{ path|field|param, message|msg }] ou d'objet { champ: "message" | ["message"] }.
 * Une erreur sans champ est rangée sous la clé "form" (à afficher en haut du formulaire).
 */
export function extractFieldErrors(err: unknown): FieldErrors {
  if (!axios.isAxiosError(err)) return {};

  const data = err.response?.data as Record<string, any> | undefined;
  const raw = data?.details ?? data?.errors ?? data?.issues;
  const source = raw?.fieldErrors ?? raw; // zod .flatten()
  const out: FieldErrors = {};

  const add = (path: unknown, message: unknown) => {
    const text = Array.isArray(message) ? message[0] : message;
    const key = normalizePath(path);
    if (typeof text === 'string' && text.trim() && !out[key]) out[key] = toFrench(text);
  };

  if (Array.isArray(source)) {
    source.forEach((d) => add(d?.path ?? d?.field ?? d?.param, d?.message ?? d?.msg));
  } else if (source && typeof source === 'object') {
    Object.entries(source).forEach(([key, value]) => add(key, value));
  }
  return out;
}

/** Message général, toujours clair et en français. */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;

  if (!err.response) {
    return err.code === 'ECONNABORTED'
      ? 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
      : 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.';
  }

  const status = err.response.status;
  if (status >= 500) return STATUS_MESSAGES[500];
  if (Object.keys(extractFieldErrors(err)).length > 0) return STATUS_MESSAGES[422];

  const message = (err.response.data as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string' && message.trim() && !GENERIC_MESSAGE.test(message)) return toFrench(message);

  return STATUS_MESSAGES[status] ?? fallback;
}

/** Contrôle d'e-mail simple, côté navigateur. */
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/**
 * Place le curseur sur le premier champ en erreur (dans l'ordre de la page).
 * Les champs doivent avoir un attribut `name` égal à la clé d'erreur.
 */
export function focusFirstError(form: HTMLFormElement | null, errors: FieldErrors) {
  if (!form) return;
  const target = Array.from(form.elements).find((el) => 'name' in el && (el as HTMLInputElement).name in errors);
  (target as HTMLElement | undefined)?.focus();
}