import axios from 'axios';

/** Message clair pour l'utilisateur : celui du serveur (4xx) sinon un texte de repli. Jamais de détail technique. */
export function authError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Connexion impossible. Vérifiez votre connexion internet puis réessayez.';
    if (error.response.status >= 500) return 'Un problème est survenu de notre côté. Réessayez dans un instant.';
    const data = error.response.data as { message?: string; details?: { message?: string }[] | null } | undefined;
    return data?.message || data?.details?.[0]?.message || fallback;
  }
  return fallback;
}

/** Évite les redirections ouvertes : seul un chemin interne est accepté. */
export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export const PASSWORD_RULES = [
  { id: 'len', label: 'Au moins 10 caractères', test: (v: string) => v.length >= 10 },
  { id: 'letter', label: 'Au moins une lettre', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'Au moins un chiffre', test: (v: string) => /\d/.test(v) },
] as const;

export const passwordIsValid = (v: string) => PASSWORD_RULES.every((r) => r.test(v));
