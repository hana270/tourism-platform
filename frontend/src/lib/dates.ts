import { toIntl } from '@/i18n/config';

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

const utc = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(utc(iso) + days * 86_400_000);
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function daysBetween(start: string, end: string): number {
  return Math.round((utc(end) - utc(start)) / 86_400_000);
}

export function formatDay(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(toIntl(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(utc(iso)));
}

export function monthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(toIntl(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(toIntl(locale), { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toISO(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}