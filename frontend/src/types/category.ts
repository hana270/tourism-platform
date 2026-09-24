export type CategoryImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  altText?: string | null;
  displayOrder: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
  images: CategoryImage[];
  translations?: { locale: string; name: string; slug: string; description?: string | null }[];
  offers?: { id: string; name: string; price: string | number }[];
};

export type CategoryFormValues = {
  name: string;
  description: string;
  isActive: boolean;
  keepImageIds: string[];
  newFiles: File[];
};
