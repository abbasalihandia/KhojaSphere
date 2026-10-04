import { get, post, put, tokenStore } from './client';
import type { AccountType, AuthResult, User } from './types';

export async function register(input: { name: string; email: string; password: string; city: string; accountType: AccountType }) {
  const res = await post<AuthResult>('/auth/register', input);
  tokenStore.set(res.token);
  return res.user;
}
export async function login(email: string, password: string) {
  const res = await post<AuthResult>('/auth/login', { email, password });
  tokenStore.set(res.token);
  return res.user;
}
export async function logout() {
  try { await post('/auth/logout'); } finally { tokenStore.clear(); }
}
export const me = () => get<User>('/auth/me');
export const forgotPassword = (email: string) => post<{ message: string }>('/auth/forgot-password', { email });
export const resetPassword = (token: string, newPassword: string) => post<{ message: string }>('/auth/reset-password', { token, newPassword });
export const changePassword = (currentPassword: string, newPassword: string) => post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
export const updateProfile = (data: Partial<Pick<User, 'name' | 'phone' | 'city' | 'bio' | 'avatarUrl'>>) => put<User>('/users/me', data);
