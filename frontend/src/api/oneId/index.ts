import type { OneIdAdapter } from './provider';
import { httpProvider } from './httpProvider';
import { mockOwnerOneId, mockProvider } from './mockProvider';
import type { OneIdProfile, OneIdState, OwnerOneId } from './types';

export * from './types';
export type { OneIdAdapter } from './provider';

export type OneIdMode = 'off' | 'mock' | 'live';

/**
 * VITE_ONE_ID_MODE = off | mock | live.
 * If unset: 'mock' while developing (npm run dev), 'off' in production builds, so demo badges can't ship by accident.
 */
export const ONE_ID_MODE: OneIdMode = (() => {
  const raw = (import.meta.env.VITE_ONE_ID_MODE as string | undefined)?.toLowerCase();
  if (raw === 'off' || raw === 'mock' || raw === 'live') return raw;
  return import.meta.env.DEV ? 'mock' : 'off';
})();

export const oneIdAdapter: OneIdAdapter | null =
  ONE_ID_MODE === 'mock' ? mockProvider : ONE_ID_MODE === 'live' ? httpProvider : null;

const EXPIRING_SOON_DAYS = 60;

/** Single source of truth for "what should the badge show right now". */
export function getOneIdState(profile: OneIdProfile | null | undefined, now: Date = new Date()): OneIdState {
  if (!profile) return 'none';
  if (profile.status === 'suspended') return 'suspended';
  if (profile.status === 'pending') return 'pending';
  if (profile.status === 'inactive') return 'inactive';
  const until = new Date(`${profile.validUntil}T23:59:59`);
  if (Number.isNaN(until.getTime())) return 'inactive';
  const daysLeft = (until.getTime() - now.getTime()) / 86_400_000;
  if (daysLeft < 0) return 'expired';
  return daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'active';
}

/** Only these states earn the public "Verified Jamaat Member" badge. */
export const isVerifiedState = (s: OneIdState) => s === 'active' || s === 'expiring';

/** 1IN4608AH-001 → 1IN••••••-001. Used wherever the number is shown, even to its owner. */
export function maskOneId(id: string): string {
  if (id.length <= 7) return '•'.repeat(id.length);
  return `${id.slice(0, 3)}${'•'.repeat(id.length - 7)}${id.slice(-4)}`;
}

export function formatValidUntil(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Owner badge for a listing/mentor card.
 * Real data wins: once the backend sends `ownerOneId`, it is used as-is and the mock is never consulted.
 */
export function resolveOwnerBadge(item: { id: number; ownerOneId?: OwnerOneId | null }, kind: string): OwnerOneId | null {
  if (ONE_ID_MODE === 'off') return null;
  if (item.ownerOneId !== undefined) return item.ownerOneId?.verified ? item.ownerOneId : null;
  return ONE_ID_MODE === 'mock' ? mockOwnerOneId(kind, item.id) : null;
}
