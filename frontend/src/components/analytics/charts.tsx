'use client';

import { useId, useRef, useState } from 'react';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Courbes « demandes » et « confirmées » par jour, avec infobulle au survol / toucher. */
export function AreaChart({ series }: { series: { date: string; requests: number; confirmed: number }[] }) {
  const gid = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 230, P = { l: 34, r: 12, t: 14, b: 28 };
  const max = Math.max(4, ...series.map((s) => s.requests));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => P.l + (series.length <= 1 ? 0 : (i / (series.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / nice) * (H - P.t - P.b);
  const line = (key: 'requests' | 'confirmed') => series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
  const area = (key: 'requests' | 'confirmed') => `${line(key)} L${x(series.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 1, 2, 3, 4].map((i) => (nice / 4) * i);
  const labelIdx = series.length < 8 ? series.map((_, i) => i) : [0, Math.floor(series.length / 3), Math.floor((2 * series.length) / 3), series.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r || series.length === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, i)));
  }
  const h = hover !== null ? series[hover] : null;

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-pan-y" role="img" aria-label="Évolution quotidienne des demandes de réservation" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${gid}-a`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity=".28" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${gid}-b`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".3" /><stop offset="100%" stopColor="#10b981" stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[10px]">{Math.round(t)}</text>
          </g>
        ))}
        <path d={area('requests')} fill={`url(#${gid}-a)`} />
        <path d={area('confirmed')} fill={`url(#${gid}-b)`} />
        <path d={line('requests')} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={line('confirmed')} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} className="fill-ink-faint text-[10px]">{fmtDay(series[i].date)}</text>)}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="currentColor" className="text-ink-faint" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(series[hover].requests)} r="4.5" fill="#6366f1" stroke="white" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(series[hover].confirmed)} r="4.5" fill="#10b981" stroke="white" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-panel" style={{ left: `${Math.min(78, Math.max(2, (x(hover) / W) * 100 - 8))}%` }}>
          <p className="font-bold text-ink">{fmtDay(h.date)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-ink-soft"><span className="h-2 w-2 rounded-full bg-indigo-500" /> {h.requests} demande{h.requests > 1 ? 's' : ''}</p>
          <p className="flex items-center gap-1.5 text-ink-soft"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {h.confirmed} confirmée{h.confirmed > 1 ? 's' : ''}</p>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Demandes reçues</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Confirmées</span>
      </div>
    </div>
  );
}

/** Barres horizontales classées (catégories, zones, formules…). */
export function BarList({ items, color = 'bg-indigo-500', empty = 'Pas encore de données' }: { items: { name: string; count: number }[]; color?: string; empty?: string }) {
  if (items.length === 0) return <p className="rounded-xl bg-surface-alt p-4 text-center text-sm text-ink-faint">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.name}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-ink">{it.name}</span>
            <span className="shrink-0 font-bold text-ink-soft">{it.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt" role="presentation">
            <div className={`h-full rounded-full ${color} transition-[width] duration-700`} style={{ width: `${Math.max(4, (it.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Anneau de répartition (statuts). */
export function Donut({ parts, total }: { parts: { label: string; value: number; color: string }[]; total: number }) {
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Répartition des réservations par statut">
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" className="text-surface-alt" strokeWidth="16" />
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => {
          const len = (p.value / total) * C;
          const el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
        <text x="70" y="70" transform="rotate(90 70 70)" textAnchor="middle" className="fill-ink text-[24px] font-extrabold">{total}</text>
        <text x="70" y="88" transform="rotate(90 70 70)" textAnchor="middle" className="fill-ink-faint text-[10px] font-semibold">demandes</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            <span className="text-ink-soft">{p.label}</span>
            <strong className="ms-auto ps-4 text-ink">{p.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
