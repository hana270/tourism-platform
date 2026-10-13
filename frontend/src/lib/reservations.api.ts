import { api, ApiEnvelope } from './api';

export type CreateReservationInput = {
  offerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startDate: string;
  endDate: string;
  guests: number;
  notes?: string;
  /** Formule choisie pour un hôtel (le prix est recalculé par le serveur). */
  priceType?: string;
};

export type BlockedRange = { startDate: string; endDate: string };

export const ReservationsApi = {
  /** Périodes déjà confirmées pour une offre (sans donnée personnelle). */
  async blockedRanges(offerId: string): Promise<BlockedRange[]> {
    const { data } = await api.get<ApiEnvelope<BlockedRange[]>>(`/availability/offer/${offerId}`);
    return data.data;
  },
  async create(input: CreateReservationInput) {
    const { data } = await api.post<ApiEnvelope<unknown>>('/reservations', input);
    return data.data;
  },
};
