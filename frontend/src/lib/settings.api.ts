import { api, ApiEnvelope } from './api';
import { Currency } from './currency';
export type ExchangeRates = { base: 'TND'; rates: Record<Currency, number>; updatedAt: string | null };
export const SettingsApi = { async exchangeRates() { const { data } = await api.get<ApiEnvelope<ExchangeRates>>('/settings/exchange-rates'); return data.data; } };
