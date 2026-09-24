/**
 * Google Translate — couche utilitaire.
 *
 * Le texte source de l'application est en français. Google Translate traduit
 * le DOM dans le navigateur ; le choix de langue est mémorisé par Google dans
 * le cookie `googtrans` (format `/fr/en`), donc conservé d'une page à l'autre.
 */

export const SOURCE_LANGUAGE = 'fr';
export const ELEMENT_ID = 'google_translate_element';
export const INIT_CALLBACK = 'ihostGoogleTranslateInit';

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pt', label: 'Português' },
] as const;

/** Langues proposées à Google (la langue source est exclue). */
export const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== SOURCE_LANGUAGE)
  .map((l) => l.code)
  .join(',');

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          elementId: string,
        ) => unknown;
      };
    };
  }
}

const RTL_LANGUAGES = ['ar'];

/** Langue actuellement affichée, lue dans le cookie de Google. */
export function readCurrentLanguage(): string {
  if (typeof document === 'undefined') return SOURCE_LANGUAGE;

  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!match) return SOURCE_LANGUAGE;

  const target = decodeURIComponent(match[1]).split('/').filter(Boolean).pop();
  return LANGUAGES.some((l) => l.code === target) ? (target as string) : SOURCE_LANGUAGE;
}

/** Aligne le sens de lecture de la page (arabe = droite → gauche). */
export function applyDirection(language: string): void {
  document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
}

function clearCookie(): void {
  const host = window.location.hostname;
  const expired = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

  document.cookie = expired;
  document.cookie = `${expired}; domain=${host}`;
  document.cookie = `${expired}; domain=.${host}`;
}

/** Méthode de secours fiable : cookie + rechargement de la page. */
function applyByCookie(language: string): void {
  clearCookie();

  if (language !== SOURCE_LANGUAGE) {
    document.cookie = `googtrans=/${SOURCE_LANGUAGE}/${language}; path=/`;
  }

  window.location.reload();
}

function isPageTranslated(): boolean {
  const html = document.documentElement;
  return html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl');
}

/** Change la langue de la page via le moteur Google Translate. */
export function setLanguage(language: string): void {
  const combo = document.querySelector<HTMLSelectElement>('select.goog-te-combo');

  // Le moteur n'est pas encore chargé (ou bloqué) : on passe par le cookie.
  if (!combo) {
    applyByCookie(language);
    return;
  }

  const restoring = language === SOURCE_LANGUAGE;

  combo.value = restoring ? '' : language;
  combo.dispatchEvent(new Event('change', { bubbles: true }));
  applyDirection(language);

  // Retour au français : si Google n'a pas restauré le texte d'origine, on force.
  if (restoring) {
    window.setTimeout(() => {
      if (isPageTranslated()) applyByCookie(SOURCE_LANGUAGE);
    }, 800);
  }
}

/**
 * Google Translate remplace des nœuds de texte par des <font>, ce qui fait
 * planter React (« removeChild » / « insertBefore » sur un nœud déplacé).
 * Ce correctif, appliqué une seule fois, rend ces deux méthodes tolérantes.
 */
export function patchDomForTranslation(): void {
  const flag = '__ihostDomPatched';
  const w = window as unknown as Record<string, unknown>;
  if (w[flag]) return;
  w[flag] = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
