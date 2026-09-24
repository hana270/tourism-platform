'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import {
  ELEMENT_ID,
  INIT_CALLBACK,
  SOURCE_LANGUAGE,
  TARGET_LANGUAGES,
  applyDirection,
  patchDomForTranslation,
  readCurrentLanguage,
} from '@/lib/google-translate';

/**
 * Moteur Google Translate — monté UNE seule fois dans le layout.
 *
 * Il charge le script Google, crée l'élément (caché) et restaure la langue
 * choisie lors de la visite précédente. Le sélecteur visible est
 * `GoogleTranslateWidget`, qui pilote ce moteur.
 */
export default function GoogleTranslateEngine() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    patchDomForTranslation();
    applyDirection(readCurrentLanguage());

    const w = window as unknown as Record<string, unknown>;

    // Le callback doit exister AVANT que le script Google ne se charge.
    w[INIT_CALLBACK] = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      const container = document.getElementById(ELEMENT_ID);

      if (!TranslateElement || !container || container.childElementCount > 0) return;

      new TranslateElement(
        {
          pageLanguage: SOURCE_LANGUAGE,
          includedLanguages: TARGET_LANGUAGES,
          autoDisplay: false,
        },
        ELEMENT_ID,
      );
    };

    setReady(true);

    return () => {
      delete w[INIT_CALLBACK];
    };
  }, []);

  return (
    <>
      <div
        id={ELEMENT_ID}
        translate="no"
        aria-hidden="true"
        className="notranslate"
        style={{
          position: 'fixed',
          top: 0,
          left: -9999,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      />

      {ready && (
        <Script
          id="google-translate-script"
          src={`https://translate.google.com/translate_a/element.js?cb=${INIT_CALLBACK}`}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
