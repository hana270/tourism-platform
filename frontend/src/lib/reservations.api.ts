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
};

export const ReservationsApi = {
  async create(input: CreateReservationInput) {
    const { data } = await api.post<ApiEnvelope<unknown>>('/reservations', input);
    return data.data;
  },
};
