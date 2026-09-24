"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Affiche son contenu directement dans <body>, hors de la page.
 * C'est ce qui garantit que les fenêtres modales sont TOUJOURS centrées dans l'écran,
 * quelles que soient les animations/transformations des conteneurs de la page.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
