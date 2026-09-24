export type Currency = 'TND' | 'EUR' | 'USD';

export const currencyLabels: Record<Currency, string> = { TND: 'TND', EUR: 'EUR', USD: 'USD' };

/**
 * Le prix enregistré est toujours en TND. Les taux sont datés et fournis par
 * le backend; une conversion affichée ne modifie jamais le prix de référence.
 */
export function convertFromTnd(value: number, currency: Currency, rates: Record<Currency, number>) {
  return currency === 'TND' ? value : value * (rates[currency] ?? 1);
}

export function formatMoney(value: number, currency: Currency = 'TND', locale = 'fr-TN') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}
