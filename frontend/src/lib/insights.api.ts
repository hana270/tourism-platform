import { api, ApiEnvelope } from './api';

export type InsightsKpis = {
  total: number; pending: number; confirmed: number; cancelled: number;
  confirmRate: number; revenue: number; guests: number;
};
export type Insights = {
  period: { days: number; from: string; to: string };
  kpis: InsightsKpis;
  previous: InsightsKpis;
  series: { date: string; requests: number; confirmed: number }[];
  topOffers: { offerId: string; name: string; total: number; confirmed: number; revenue: number }[];
  byCategory: { name: string; count: number }[];
  byZone: { name: string; count: number }[];
  formulas: { name: string; count: number }[];
  catalog: { offersPublished: number; activePromotions: number; upcoming: number; pendingNow: number };
};

export const InsightsApi = {
  async overview(days: number): Promise<Insights> {
    const { data } = await api.get<ApiEnvelope<Insights>>('/insights/overview', { params: { days } });
    return data.data;
  },
};
