import { api, ApiEnvelope } from './api';

export type ReservationStatus = 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'NOT_PAID' | 'PENDING' | 'PAID';

export type ReservationOffer = {
  id: string;
  name: string;
  slug?: string;
  price?: string | number;
  priceUnit?: string;
  isHotel?: boolean;
  zone?: { name: string } | null;
  photos?: { url: string }[];
};

export type ReservationHistoryItem = {
  id: string;
  action: string;
  metadata?: Record<string, string | null> | null;
  createdAt: string;
  user?: { firstName: string; lastName: string } | null;
};

export type Reservation = {
  id: string;
  offerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  guests: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  adminNotes?: string | null;
  notes?: string | null;
  /** Formule choisie (hôtels) et prix unitaire appliqué à la demande (promotion comprise). */
  priceType?: string | null;
  unitPrice?: string | number | null;
  createdAt?: string;
  offer?: ReservationOffer;
  /** Une réservation déjà confirmée occupe ces dates (demande ouverte uniquement). */
  conflict?: boolean;
  conflictWith?: { customerName: string | null; startDate: string; endDate: string; hotel?: boolean } | null;
  history?: ReservationHistoryItem[];
};

export type ReservationStats = {
  byStatus: Record<ReservationStatus, number>;
  total: number;
  arrivalsToday: number;
  departuresToday: number;
  upcoming: number;
};

export type CalendarReservation = {
  id: string;
  offerId: string;
  customerName: string;
  customerPhone: string;
  guests: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  startDate: string;
  endDate: string;
  offer: { id: string; name: string; isHotel?: boolean; roomCount?: number | null };
};

export type ManualReservationInput = {
  offerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startDate: string;
  endDate: string;
  guests: number;
  notes?: string;
  adminNotes?: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
};

export type ReservationFilters = {
  status?: string;
  offerId?: string;
  q?: string;
  from?: string;
  to?: string;
};

export type AvailabilityBlock = { id: string; offerId: string; startDate: string; endDate: string; offer?: { name: string; isHotel?: boolean }; reservation?: { id: string; customerName: string; customerPhone?: string; status: string; paymentStatus: string } | null };
export type PromotionOffer = { id: string; name: string; isHotel: boolean; price?: string | number | null; simplePrice?: string | number | null; halfBoardPrice?: string | number | null; fullBoardPrice?: string | number | null; allInclusivePrice?: string | number | null };
export type Promotion = { id: string; offerId: string; priceType: string; oldPrice: number | string; newPrice: number | string; startDate: string; endDate: string; status: string; showOnHomepage: boolean; offer?: PromotionOffer };
export type PromotionCreateInput = { offerId: string; items: { priceType: string; newPrice: number }[]; startDate: string; endDate: string; status: 'ACTIVE' | 'INACTIVE'; showOnHomepage: boolean };
export type PromotionUpdateInput = { newPrice?: number; startDate?: string; endDate?: string; status?: 'ACTIVE' | 'INACTIVE'; showOnHomepage?: boolean };

export const OperationsApi = {
  async reservations(filters?: ReservationFilters | string) {
    const params = typeof filters === 'string' ? { status: filters } : filters;
    const { data } = await api.get<ApiEnvelope<Reservation[]>>('/reservations', { params });
    return data.data;
  },
  async reservation(id: string) { const { data } = await api.get<ApiEnvelope<Reservation>>(`/reservations/${id}`); return data.data; },
  async reservationStats() { const { data } = await api.get<ApiEnvelope<ReservationStats>>('/reservations/stats'); return data.data; },
  async calendar(params: { from: string; to: string; offerId?: string }) { const { data } = await api.get<ApiEnvelope<CalendarReservation[]>>('/reservations/calendar', { params }); return data.data; },
  async createReservation(payload: { offerId: string; customerName: string; customerPhone: string; customerEmail?: string; startDate: string; endDate: string; guests: number; notes?: string }) { const { data } = await api.post<ApiEnvelope<Reservation>>('/reservations', payload); return data.data; },
  async createManualReservation(payload: ManualReservationInput) { const { data } = await api.post<ApiEnvelope<Reservation>>('/reservations/manual', payload); return data.data; },
  async updateReservation(id: string, payload: Partial<Pick<Reservation, 'status' | 'paymentStatus' | 'adminNotes'>>) { const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}`, payload); return data.data; },
  async deleteReservation(id: string) { await api.delete(`/reservations/${id}`); },
  async blocks(offerId?: string) { const { data } = await api.get<ApiEnvelope<AvailabilityBlock[]>>('/availability', { params: offerId ? { offerId } : undefined }); return data.data; },
  async promotions() { const { data } = await api.get<ApiEnvelope<Promotion[]>>('/promotions'); return data.data; },
  async createPromotion(payload: PromotionCreateInput) { const { data } = await api.post<ApiEnvelope<Promotion[]>>('/promotions', payload); return data.data; },
  async updatePromotion(id: string, payload: PromotionUpdateInput) { const { data } = await api.patch<ApiEnvelope<Promotion>>(`/promotions/${id}`, payload); return data.data; },
  async deletePromotion(id: string) { await api.delete(`/promotions/${id}`); },
};
