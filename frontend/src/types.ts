export type PageKey =
  | 'home'
  | 'search'
  | 'business'
  | 'properties'
  | 'marketplace'
  | 'mentorship'
  | 'ai-listing'
  | 'ai-assistant'
  | 'saved'
  | 'dashboard'
  | 'admin'
  | 'auth-signin'
  | 'auth-register'
  | 'auth-reset';

export type NavigateFn = (page: PageKey, params?: Record<string, unknown>) => void;

export interface PageProps {
  navigate: NavigateFn;
  params?: Record<string, unknown>;
}
