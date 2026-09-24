import { api, ApiEnvelope } from './api';

export type DashboardSummary = {
  categories: number;
  activeCategories: number;
  offers: number;
  publishedOffers: number;
  draftOffers: number;
  archivedOffers: number;
  zones: number;
  bookings: number;
  generatedAt: string;
};

let cached: { data: DashboardSummary; expiresAt: number } | null = null;

export async function getDashboardSummary(force = false): Promise<DashboardSummary> {
  if (!force && cached && cached.expiresAt > Date.now()) return cached.data;
  const { data } = await api.get<ApiEnvelope<DashboardSummary>>('/analytics/summary');
  cached = { data: data.data, expiresAt: Date.now() + 15_000 };
  return data.data;
}
