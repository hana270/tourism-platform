'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import clsx from 'clsx';
import { imageUrl } from '@/lib/api';

export function RemoteImage({
  src,
  alt,
  className,
  eager,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);
  const url = imageUrl(src);

  // Nouvelle source -> on repart de zéro.
  useEffect(() => {
    setState('loading');
  }, [url]);

  // L'image peut déjà être chargée (cache / rendu serveur) AVANT que React
  // n'attache onLoad : dans ce cas l'événement est perdu et l'image restait
  // invisible (opacity-0). On vérifie donc l'état réel de l'élément.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setState(img.naturalWidth > 0 ? 'ready' : 'failed');
  }, [url]);

  if (!url || state === 'failed') {
    return (
      <div
        className={clsx('public-image-fallback flex items-center justify-center bg-surface-alt text-ink-faint', className)}
        role="img"
        aria-label={alt}
      >
        <span className="flex flex-col items-center gap-2 px-4 text-center">
          <ImageOff size={22} strokeWidth={1.5} />
          <span className="text-[11px] font-semibold text-[var(--accent-deep)]">Image temporairement indisponible</span>
        </span>
      </div>
    );
  }
  return (
    <span className={clsx('relative block overflow-hidden', className)}>
      {state === 'loading' && <span className="skeleton absolute inset-0" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
        className={clsx(
          'h-full w-full object-cover transition-opacity duration-300',
          state === 'ready' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  );
}
