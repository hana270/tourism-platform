'use client';

import { useState } from 'react';
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
  const url = imageUrl(src);

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
