'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from '@/i18n/translate';
import { Pencil, Trash2, ImageOff, GripVertical, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Category } from '@/types/category';
import { imageUrl } from '@/lib/api';

function coverUrl(category: Category) {
  if (!category.images?.length) return null;
  const cover = [...category.images].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  return cover ? imageUrl(cover.thumbnailUrl || cover.url) : null;
}

export function CategoryTable({
  categories,
  onEdit,
  onDelete,
  onReorder,
  deletingId,
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onReorder: (orderedIds: string[]) => void;
  deletingId: string | null;
}) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next.map((c) => c.id));
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...categories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    onReorder(next.map((c) => c.id));
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt/60 text-left text-xs text-ink-soft">
              <th className="w-16 px-4 py-3 font-medium" aria-label="Order" />
              <th className="px-2 py-3 font-medium">{t('table.image')}</th>
              <th className="px-4 py-3 font-medium">{t('table.name')}</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">{t('table.status')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => {
              const imgUrl = coverUrl(category);
              const isDragging = dragIndex === index;
              const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

              return (
                <tr
                  key={category.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  onDrop={() => handleDrop(index)}
                  className={clsx(
                    'border-b border-border last:border-0 transition-colors',
                    isDragging && 'opacity-40',
                    isOver && 'bg-surface-alt',
                    !isDragging && !isOver && 'hover:bg-surface-alt/60',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" title={t('dragHint')}>
                      <GripVertical size={15} className="cursor-grab text-ink-faint active:cursor-grabbing" />
                      <div className="flex flex-col">
                        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="btn-icon h-6 w-6 disabled:opacity-25" title={t('moveUp')} aria-label={t('moveUp')}>
                          <ChevronUp size={13} />
                        </button>
                        <button type="button" disabled={index === categories.length - 1} onClick={() => move(index, 1)} className="btn-icon h-6 w-6 disabled:opacity-25" title={t('moveDown')} aria-label={t('moveDown')}>
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl} alt={category.name} loading="lazy" decoding="async" className="h-10 w-10 rounded-lg border border-border object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border text-ink-faint"><ImageOff size={15} /></div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{category.name}</p>
                    {category.description && <p className="max-w-xs line-clamp-1 text-xs text-ink-faint">{category.description}</p>}
                    <span className={clsx('badge mt-1 inline-block md:hidden', category.isActive ? 'bg-success-soft text-success' : 'bg-surface-alt text-ink-faint')}>
                      {category.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className={clsx('badge', category.isActive ? 'bg-success-soft text-success' : 'bg-surface-alt text-ink-faint')}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', category.isActive ? 'bg-success' : 'bg-ink-faint')} />
                      {category.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/${locale}/dashboard/categories/${category.id}`} aria-label={t('view')} title={t('view')} className="btn-icon h-8 w-8"><Eye size={14} /></Link>
                      <button type="button" onClick={() => onEdit(category)} aria-label={t('edit')} title={t('edit')} className="btn-icon h-8 w-8"><Pencil size={14} /></button>
                      <button type="button" onClick={() => onDelete(category)} disabled={deletingId === category.id} aria-label={t('delete')} title={t('delete')} className="btn-icon h-8 w-8 hover:border-danger/30 hover:bg-danger-soft hover:text-danger disabled:opacity-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-surface-alt/40 px-4 py-2.5 text-[11px] text-ink-faint">{t('dragHint')}</div>
    </div>
  );
}
