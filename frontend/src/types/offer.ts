export type OfferStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type Zone = {
  id: string;
  name: string;
  slug: string;
  _count?: { offers: number };
  createdAt?: string;
  updatedAt?: string;
};

export type OfferPhoto = { id?: string; url: string; isPrimary: boolean; altText?: string | null };
export type OfferCustomField = { id?: string; fieldName: string; value: string };
export type OfferPromotion = {
  id: string;
  priceType: string;
  oldPrice: string | number;
  newPrice: string | number;
  startDate: string;
  endDate: string;
};

export type Offer = {
  id: string;
  categoryId: string;
  zoneId: string | null;
  name: string;
  description: string | null;
  price: string | number;
  isHotel: boolean;
  capacity: number | null;
  /** false = platform checks and blocks the full offer automatically; true = partner availability is checked manually. */
  availabilityOnRequest: boolean;
  availabilityOnDemand?: boolean;
  stars: number | null;
  simplePrice: string | number | null;
  halfBoardPrice: string | number | null;
  allInclusivePrice: string | number | null;
  fullBoardPrice: string | number | null;
  status: OfferStatus;
  address: string | null;
  googleMapsUrl: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  zone?: Zone | null;
  photos: OfferPhoto[];
  customFields?: OfferCustomField[];
  promotions?: OfferPromotion[];
  automaticEnglish?: { name: string; description: string | null; address: string | null };
};

export type OfferFormValues = {
  categoryId: string;
  zoneId: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  address: string;
  googleMapsUrl: string;
  isHotel: boolean;
  capacity: string;
  /** false = platform checks and blocks the full offer automatically; true = partner availability is checked manually. */
  availabilityOnRequest: boolean;
  availabilityOnDemand?: boolean;
  stars: '' | '1' | '2' | '3' | '4' | '5';
  price: string;
  simplePrice: string;
  halfBoardPrice: string;
  allInclusivePrice: string;
  fullBoardPrice: string;
  photos: { url: string; isPrimary: boolean; altText: string }[];
  customFields: { fieldName: string; value: string }[];
};
