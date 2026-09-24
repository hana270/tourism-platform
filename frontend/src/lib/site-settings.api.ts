import { api, ApiEnvelope } from './api';
export type ContactSettings = { whatsappNumero: string; telephone: string; email: string; adresse: string; facebook: string; instagram: string };
export type HomepageSettings = { logo: string; nomSite: string; photoCouverture: string; titreAccueil: string; sousTitre: string };
export const SiteSettingsApi = {
  async contact() { const { data } = await api.get<ApiEnvelope<ContactSettings>>('/settings/contact'); return data.data; },
  async saveContact(value: ContactSettings) { const { data } = await api.patch<ApiEnvelope<ContactSettings>>('/settings/contact', value); return data.data; },
  async homepage() { const { data } = await api.get<ApiEnvelope<HomepageSettings>>('/settings/homepage'); return data.data; },
  async saveHomepage(value: HomepageSettings) { const { data } = await api.patch<ApiEnvelope<HomepageSettings>>('/settings/homepage', value); return data.data; },
  async uploadImage(file: File) { const fd = new FormData(); fd.append('image', file); const { data } = await api.post<ApiEnvelope<{ url: string }>>('/settings/homepage/upload', fd); return data.data.url; },
};
