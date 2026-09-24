import { api, ApiEnvelope } from './api';
import { Zone } from '@/types/offer';

export const ZonesApi = {
  async list(locale = 'fr'): Promise<Zone[]> { const { data } = await api.get<ApiEnvelope<Zone[]>>('/zones', { params: { locale } }); return data.data; },
  async get(id: string, locale = 'fr'): Promise<Zone> { const { data } = await api.get<ApiEnvelope<Zone>>(`/zones/${id}`, { params: { locale } }); return data.data; },
  async create(name: string): Promise<Zone> { const { data } = await api.post<ApiEnvelope<Zone>>('/zones', { name }); return data.data; },
  async update(id: string, name: string): Promise<Zone> { const { data } = await api.patch<ApiEnvelope<Zone>>(`/zones/${id}`, { name }); return data.data; },
  async remove(id: string) { await api.delete(`/zones/${id}`); },
};
