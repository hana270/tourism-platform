export type OfferStatus = 'PUBLISHED' | 'ARCHIVED';

export type Zone = {
  id: string;
  name: string;
  slug: string;
  _count?: { offers: number };
  createdAt?: string;
  updatedAt?: string;
};

export type OfferPhoto = { id?: string; url: string; isPrimary: boolean; altText?: string | null };
export type AccommodationType = 'HOTEL' | 'APARTMENT' | 'VILLA' | 'GUESTHOUSE' | 'OTHER';
export type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'LIST' | 'LINK';
export type OfferCustomField = {
  id?: string;
  fieldName: string;
  value: string;
  fieldType?: FieldType;
  icon?: string | null;
  groupName?: string | null;
  position?: number;
};
export type PriceKey = 'BASE' | 'SIMPLE' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';

export type OfferPromotion = {
  id: string;
  priceType: PriceKey | string;
  oldPrice: string | number;
  newPrice: string | number;
  startDate: string;
  endDate: string;
  showOnHomepage?: boolean;
};

export type Offer = {
  id: string;
  categoryId: string;
  zoneId: string | null;
  name: string;
  description: string | null;
  price: string | number;
  priceUnit?: string;
  isHotel: boolean;
  accommodationType?: AccommodationType | null;
  capacity: number | null;
  /** Hôtels : nombre de chambres réservables en même temps (null = pas de limite). */
  roomCount?: number | null;
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
  category?: { id: string; name: string; slug?: string } | null;
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
  status: 'PUBLISHED' | 'ARCHIVED';
  address: string;
  googleMapsUrl: string;
  isHotel: boolean;
  accommodationType: '' | AccommodationType;
  capacity: string;
  roomCount: string;
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
  customFields: { fieldName: string; value: string; fieldType: FieldType; icon: string; groupName: string }[];
};
