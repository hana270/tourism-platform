'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from '@/i18n/translate';
import clsx from 'clsx';
import { imageUrl } from '@/lib/api';
import { Portal } from './Portal';

export type LightboxImage = { src: string; thumb?: string; alt: string };

export function Lightbox({
  images,
  index,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const t = useTranslations('lightbox');
  const open = index !== null && images.length > 0;
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      setZoomed(false);
      setLoaded(false);
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  const close = useCallback(() => {
    setZoomed(false);
    onIndexChange(null);
  }, [onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, go]);

  useEffect(() => {
    if (index === null || images.length < 2) return;
    [1, -1].forEach((d) => {
      const img = new Image();
      img.src = imageUrl(images[(index + d + images.length) % images.length].src);
    });
  }, [index, images]);

  if (!open || index === null) return null;
  const current = images[index];
  const many = images.length > 1;

  return (
    <Portal>
      <div
        className="anim-fade fixed inset-0 z-[90] flex flex-col bg-black/90 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={current.alt}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null || zoomed) return;
          const delta = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(delta) > 60 && many) go(delta < 0 ? 1 : -1);
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-white/90">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums">
            {index + 1} / {images.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? t('zoomOut') : t('zoomIn')}
            >
              {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>
            <a
              className="rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
              href={imageUrl(current.src)}
              target="_blank"
              rel="noreferrer"
              aria-label={t('openNew')}
            >
              <ExternalLink size={18} />
            </a>
            <button
              type="button"
              className="rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
              onClick={close}
              aria-label={t('close')}
              data-autofocus
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 sm:px-16"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          {!loaded && <div className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.src}
            src={imageUrl(current.src)}
            alt={current.alt}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
              setZoomed((z) => !z);
            }}
            style={{ transformOrigin: origin }}
            className={clsx(
              'anim-pop max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-transform duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
              zoomed ? 'scale-[2] cursor-zoom-out' : 'cursor-zoom-in',
            )}
          />
          {many && (
            <>
              <button
                type="button"
                className="absolute start-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 sm:block"
                onClick={() => go(-1)}
                aria-label={t('previous')}
              >
                <ChevronLeft size={22} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                className="absolute end-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 sm:block"
                onClick={() => go(1)}
                aria-label={t('next')}
              >
                <ChevronRight size={22} className="rtl:rotate-180" />
              </button>
            </>
          )}
        </div>

        <div className="px-4 pb-4 pt-3">
          <p className="mb-3 truncate text-center text-sm text-white/80">{current.alt}</p>
          {many && (
            <div className="mx-auto flex max-w-full justify-center gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={`${img.src}-${i}`}
                  type="button"
                  onClick={() => {
                    setZoomed(false);
                    setLoaded(false);
                    onIndexChange(i);
                  }}
                  aria-label={`${i + 1}`}
                  aria-current={i === index}
                  className={clsx(
                    'h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                    i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img.thumb ?? img.src)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}