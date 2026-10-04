import { get, post, request } from './client';
import type { AIStatus, Category, ChatReply, DashboardSummary, ListingDraft, SearchPage, Stats } from './types';

export interface SearchQuery {
  q?: string; category?: string; city?: string; locality?: string; type?: string; price_min?: number; price_max?: number;
  sort?: string; page?: number; limit?: number; ai?: boolean;
}
export const search = (q: SearchQuery, signal?: AbortSignal) => get<SearchPage>('/search', q as Record<string, string | number | boolean | undefined>, signal);
export const categories = (kind?: 'business' | 'marketplace') => get<Category[]>('/categories', { kind });
export const stats = () => get<Stats>('/stats');
export const dashboardSummary = () => get<DashboardSummary>('/dashboard/summary');

export const ai = {
  status: () => get<AIStatus>('/ai/status'),
  chat: (message: string, history: { role: 'user' | 'ai'; text: string }[]) => post<ChatReply>('/ai/chat', { message, history }),
  draft: (kind: 'business' | 'property' | 'marketplace', text: string) => post<ListingDraft>('/ai/listing-draft', { kind, text }),
};

export async function uploadImages(files: File[]): Promise<string[]> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const res = await request<{ files: { url: string }[] }>('POST', '/uploads', { form });
  return res.files.map((f) => f.url);
}
