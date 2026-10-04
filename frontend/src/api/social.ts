import { del, get, patch, post, put } from './client';
import type { AdminOverview, AdminUser, Business, Category, EntityType, FavoriteIds, FavoritesDetail, Inquiry, MarketItem, Mentor, Page, Property, Report } from './types';

export const favorites = {
  ids: () => get<FavoriteIds>('/favorites/ids'),
  detail: () => get<FavoritesDetail>('/favorites'),
  add: (entityType: EntityType, entityId: number) => post('/favorites', { entityType, entityId }),
  remove: (entityType: EntityType, entityId: number) => del(`/favorites/${entityType}/${entityId}`),
};
export const inquiries = {
  send: (d: { targetType: EntityType | 'mentor'; targetId: number; name: string; message: string; contactMethod: string }) => post<Inquiry>('/inquiries', d),
  list: (box: 'received' | 'sent', page = 1) => get<Page<Inquiry>>('/inquiries', { box, page, limit: 20 }),
  markRead: (id: number) => post<Inquiry>(`/inquiries/${id}/read`),
  reply: (id: number, text: string) => post<Inquiry>(`/inquiries/${id}/reply`, { text }),
};
export const reports = {
  create: (d: { entityType: EntityType; entityId: number; reason: string; details?: string }) => post<Report>('/reports', d),
};
export const mentors = {
  list: (q?: string) => get<Page<Mentor>>('/mentors', { q, limit: 50 }),
  request: (id: number, message?: string) => post<Inquiry>(`/mentors/${id}/request`, { message }),
  mine: () => get<Mentor | null>('/mentors/me'),
  saveMine: (d: { headline: string; expertise: string[]; education?: string; format?: string; availability?: string; bio?: string }) => put<Mentor>('/mentors/me', d),
};

type Q = Record<string, string | number | undefined>;
export const admin = {
  overview: () => get<AdminOverview>('/admin/overview'),
  users: (q: Q = {}) => get<Page<AdminUser>>('/admin/users', q),
  patchUser: (id: number, d: { isActive?: boolean; role?: 'user' | 'admin' }) => patch<AdminUser>(`/admin/users/${id}`, d),
  businesses: (q: Q = {}) => get<Page<Business>>('/admin/businesses', q),
  moderateBusiness: (id: number, action: string) => post<Business>(`/admin/businesses/${id}/moderate`, { action }),
  properties: (q: Q = {}) => get<Page<Property>>('/admin/properties', q),
  marketplace: (q: Q = {}) => get<Page<MarketItem>>('/admin/marketplace', q),
  setStatus: (kind: 'property' | 'marketplace', id: number, status: string) => post(`/admin/listings/${kind}/${id}/status`, { status }),
  deleteListing: (kind: EntityType, id: number) => del(`/admin/listings/${kind}/${id}`),
  reports: () => get<Page<Report>>('/admin/reports', { limit: 100 }),
  patchReport: (id: number, d: { status?: string; hideListing?: boolean }) => patch<Report>(`/admin/reports/${id}`, d),
  mentors: (q: Q = {}) => get<Page<Mentor>>('/admin/mentors', q),
  moderateMentor: (id: number, action: string) => post<Mentor>(`/admin/mentors/${id}/moderate`, { action }),
  categories: () => get<Category[]>('/admin/categories'),
  createCategory: (d: { kind: string; name: string; icon?: string }) => post<Category>('/admin/categories', d),
  patchCategory: (id: number, d: { name?: string; isActive?: boolean }) => patch<Category>(`/admin/categories/${id}`, d),
  deleteCategory: (id: number) => del(`/admin/categories/${id}`),
};
