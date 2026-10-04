import { del, get, post, put } from './client';
import type { Business, MarketItem, Page, Property } from './types';

export type BusinessInput = Partial<{
  kind: 'business' | 'professional'; name: string; category: string; shortDesc: string; description: string; city: string; locality: string;
  address: string; phone: string; email: string; website: string; instagram: string; hours: string; priceMin: number | null;
  priceMax: number | null; priceLabel: string; tags: string[]; services: { name: string; price?: string }[]; images: string[]; coverImage: string | null;
  submit: boolean;
}>;
export type PropertyInput = Partial<{
  title: string; description: string; listingType: string; propertyType: string; price: number; pricePeriod: string; city: string; locality: string;
  address: string; bedrooms: number | null; bathrooms: number | null; areaSqft: number | null; furnishing: string | null; amenities: string[];
  images: string[]; posterType: string; availability: string; status: 'active' | 'closed';
}>;
export type MarketInput = Partial<{
  title: string; description: string; category: string; price: number; negotiable: boolean; condition: string; city: string; locality: string;
  images: string[]; status: 'active' | 'sold';
}>;
type Q = Record<string, string | number | undefined>;

export const businesses = {
  list: (q: Q = {}, signal?: AbortSignal) => get<Page<Business>>('/businesses', q, signal),
  get: (id: number) => get<Business>(`/businesses/${id}`),
  mine: () => get<Business[]>('/businesses/mine'),
  create: (d: BusinessInput) => post<Business>('/businesses', d),
  update: (id: number, d: BusinessInput) => put<Business>(`/businesses/${id}`, d),
  submit: (id: number) => post<Business>(`/businesses/${id}/submit`),
  remove: (id: number) => del(`/businesses/${id}`),
};
export const properties = {
  list: (q: Q = {}, signal?: AbortSignal) => get<Page<Property>>('/properties', q, signal),
  get: (id: number) => get<Property>(`/properties/${id}`),
  mine: () => get<Property[]>('/properties/mine'),
  create: (d: PropertyInput) => post<Property>('/properties', d),
  update: (id: number, d: PropertyInput) => put<Property>(`/properties/${id}`, d),
  remove: (id: number) => del(`/properties/${id}`),
};
export const marketplace = {
  list: (q: Q = {}, signal?: AbortSignal) => get<Page<MarketItem>>('/marketplace', q, signal),
  get: (id: number) => get<MarketItem>(`/marketplace/${id}`),
  mine: () => get<MarketItem[]>('/marketplace/mine'),
  create: (d: MarketInput) => post<MarketItem>('/marketplace', d),
  update: (id: number, d: MarketInput) => put<MarketItem>(`/marketplace/${id}`, d),
  remove: (id: number) => del(`/marketplace/${id}`),
};
