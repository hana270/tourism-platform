import { api, ApiEnvelope } from './api';

export type CurrentUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName: string;
  lastName: string;
  profilePhoto?: string | null;
  role: 'ADMIN' | 'STAFF';
  lastLoginAt?: string | null;
};

export const AuthApi = {
  async me() {
    const { data } = await api.get<ApiEnvelope<CurrentUser>>('/auth/me');
    return data.data;
  },
  async login(login: string, password: string) {
    const { data } = await api.post<ApiEnvelope<CurrentUser>>('/auth/login', { login, password });
    return data.data;
  },
  async logout() { await api.post('/auth/logout'); },
  async forgotPassword(email: string) { await api.post('/auth/forgot-password', { email }); },
  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
  },
  async updateProfile(payload: { username?: string; email?: string; firstName?: string; lastName?: string; currentPassword?: string }) {
    const { data } = await api.patch<ApiEnvelope<CurrentUser>>('/auth/me', payload);
    return data.data;
  },
  async uploadProfilePhoto(file: File) {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post<ApiEnvelope<{ profilePhoto: string }>>('/auth/me/photo', fd);
    return data.data.profilePhoto;
  },
};
