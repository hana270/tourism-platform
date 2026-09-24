import { api, ApiEnvelope } from "./api";
import { Offer, OfferFormValues, OfferStatus } from "@/types/offer";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function payload(values: OfferFormValues) {
  const hotel = values.isHotel;
  return {
    categoryId: values.categoryId,
    zoneId: values.zoneId,
    name: values.name.trim(),
    description: values.description.trim() || null,
    status: values.status,
    address: values.address.trim() || null,
    googleMapsUrl: values.googleMapsUrl.trim() || null,
    isHotel: hotel,
    capacity: hotel ? null : num(values.capacity),
    // DB/business-rule field: Oui means partner availability is checked manually.
    availabilityOnDemand: values.availabilityOnRequest,
    stars: hotel && values.stars ? Number(values.stars) : null,
    price: hotel ? null : num(values.price),
    simplePrice: hotel ? num(values.simplePrice) : null,
    halfBoardPrice: hotel ? num(values.halfBoardPrice) : null,
    allInclusivePrice: hotel ? num(values.allInclusivePrice) : null,
    fullBoardPrice: hotel ? num(values.fullBoardPrice) : null,
    photos: values.photos.filter((p) => p.url.trim()),
    customFields: values.customFields.filter((f) => f.fieldName.trim() && f.value.trim()).map((f) => ({ fieldName: f.fieldName.trim(), value: f.value.trim() })),
  };
}

/** Transforme "/uploads/..." en URL absolue vers le backend. */
export function assetUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (
    process.env.NEXT_PUBLIC_ASSET_ORIGIN ??
    process.env.NEXT_PUBLIC_API_ORIGIN ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000/api"
  ).replace(/\/api\/?$/, "");
  return `${base}${url}`;
}

export type OfferSearchParams = {
  locale?: string;
  categoryId?: string;
  zoneId?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: OfferStatus;
};

const cleanParams = (params: OfferSearchParams) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const OffersApi = {
  async list(params: string | OfferSearchParams = 'fr'): Promise<Offer[]> {
    const query = typeof params === 'string' ? { locale: params } : cleanParams(params);
    const { data } = await api.get<ApiEnvelope<Offer[]>>("/offers", { params: query });
    return data.data;
  },
  async get(id: string, locale?: string): Promise<Offer> {
    const { data } = await api.get<ApiEnvelope<Offer>>(`/offers/${id}`, {
      params: locale ? { locale } : undefined,
    });
    return data.data;
  },
  async getBySlug(slug: string, locale?: string): Promise<Offer> {
    const { data } = await api.get<ApiEnvelope<Offer>>(`/offers/slug/${slug}`, {
      params: locale ? { locale } : undefined,
    });
    return data.data;
  },
  async create(values: OfferFormValues): Promise<Offer> {
    const { data } = await api.post<ApiEnvelope<Offer>>(
      "/offers",
      payload(values),
    );
    return data.data;
  },
  async update(id: string, values: OfferFormValues): Promise<Offer> {
    const { data } = await api.patch<ApiEnvelope<Offer>>(
      `/offers/${id}`,
      payload(values),
    );
    return data.data;
  },
  async updateStatus(id: string, status: OfferStatus): Promise<Offer> {
    const { data } = await api.patch<ApiEnvelope<Offer>>(
      `/offers/${id}/status`,
      { status },
    );
    return data.data;
  },
  async remove(id: string) {
    await api.delete(`/offers/${id}`);
  },
  async uploadImages(files: File[]): Promise<string[]> {
    const form = new FormData();
    files.forEach((file) => form.append("images", file));
    const { data } = await api.post<ApiEnvelope<string[]>>(
      "/offers/upload-images",
      form,
    );
    return data.data;
  },
};
