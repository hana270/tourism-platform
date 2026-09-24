import { api, ApiEnvelope } from './api';
import { Category, CategoryFormValues } from '@/types/category';

function toFormData(values: CategoryFormValues, displayOrder?: number) {
  const fd = new FormData();
  fd.append('name', values.name.trim());
  fd.append('description', values.description ?? '');
  fd.append('isActive', String(values.isActive));
  if (displayOrder !== undefined) fd.append('displayOrder', String(displayOrder));
  values.keepImageIds.forEach((id) => fd.append('keepImageIds', id));
  values.newFiles.forEach((file) => fd.append('images', file));
  return fd;
}

export const CategoriesApi = {
  async list(locale = 'fr'): Promise<Category[]> {
    const { data } = await api.get<ApiEnvelope<Category[]>>('/categories', { params: { locale } });
    return [...data.data].sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async get(id: string, locale = 'fr'): Promise<Category> {
    const { data } = await api.get<ApiEnvelope<Category>>(`/categories/${id}`, { params: { locale } });
    return data.data;
  },

  async create(values: CategoryFormValues): Promise<Category> {
    const { data } = await api.post<ApiEnvelope<Category>>('/categories', toFormData(values), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async update(id: string, values: CategoryFormValues): Promise<Category> {
    const { data } = await api.patch<ApiEnvelope<Category>>(
      `/categories/${id}`,
      toFormData(values),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },

  /**
   * Persist the complete order sequentially.
   * Parallel PATCH requests can arrive out of order and make the database
   * keep duplicate/incorrect positions. Sending one small JSON PATCH at a
   * time is deterministic and works with ordinary partial-update endpoints.
   */
  async reorder(items: { id: string; displayOrder: number }[]): Promise<void> {
    for (const { id, displayOrder } of items) {
      await api.patch(`/categories/${id}`, { displayOrder });
    }
  },
};
