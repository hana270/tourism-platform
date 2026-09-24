import { api, ApiEnvelope } from './api';

export type Reservation = { id: string; offerId: string; customerName: string; customerPhone: string; customerEmail?: string | null; startDate?: string | null; endDate?: string | null; guests: number; status: string; paymentStatus: string; adminNotes?: string | null; offer?: { name: string } };
export type AvailabilityBlock = { id: string; offerId: string; startDate: string; endDate: string; offer?: { name: string }; reservation?: { customerName: string } | null };
export type Promotion = { id: string; offerId: string; oldPrice: number; newPrice: number; startDate: string; endDate: string; status: string; showOnHomepage: boolean; offer?: { name: string } };

export const OperationsApi = {
  async reservations(status?: string) { const { data } = await api.get<ApiEnvelope<Reservation[]>>('/reservations', { params: status ? { status } : undefined }); return data.data; },
  async createReservation(payload: { offerId: string; customerName: string; customerPhone: string; customerEmail?: string; startDate: string; endDate: string; guests: number; notes?: string }) { const { data } = await api.post<ApiEnvelope<Reservation>>('/reservations', payload); return data.data; },
  async updateReservation(id: string, payload: Partial<Pick<Reservation, 'status' | 'paymentStatus' | 'adminNotes'>>) { const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}`, payload); return data.data; },
  async blocks(offerId?: string) { const { data } = await api.get<ApiEnvelope<AvailabilityBlock[]>>('/availability', { params: offerId ? { offerId } : undefined }); return data.data; },
  async createBlock(payload: { offerId: string; startDate: string; endDate: string }) { const { data } = await api.post<ApiEnvelope<AvailabilityBlock>>('/availability', payload); return data.data; },
  async deleteBlock(id: string) { await api.delete(`/availability/${id}`); },
  async promotions() { const { data } = await api.get<ApiEnvelope<Promotion[]>>('/promotions'); return data.data; },
  async createPromotion(payload: Omit<Promotion, 'id' | 'offer'>) { const { data } = await api.post<ApiEnvelope<Promotion>>('/promotions', payload); return data.data; },
  async updatePromotion(id: string, payload: Partial<Omit<Promotion, 'id' | 'offer'>>) { const { data } = await api.patch<ApiEnvelope<Promotion>>(`/promotions/${id}`, payload); return data.data; },
  async deletePromotion(id: string) { await api.delete(`/promotions/${id}`); },
};
