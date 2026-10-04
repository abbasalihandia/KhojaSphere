import type { OneIdAdapter } from './provider';
import { DEFAULT_VISIBILITY, type MockScenario, type OneIdProfile, type OneIdVisibility, type OwnerOneId } from './types';

// All data below is fictional. Do not paste real member cards or ID numbers into this file.

const iso = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const base = { federation: { name: 'Sample Federation' }, jamaat: { name: 'Sample Jamaat' } };

const PROFILES: Record<string, () => OneIdProfile> = {
  active: () => ({ ...base, oneIdNumber: '1XX0000AA-001', fullName: 'Sample Member', status: 'active', validUntil: iso(500) }),
  expiring: () => ({ ...base, oneIdNumber: '1XX0000AB-002', fullName: 'Sample Member', status: 'active', validUntil: iso(21) }),
  pending: () => ({ ...base, oneIdNumber: '1XX0000AC-003', fullName: 'Sample Member', status: 'pending', validUntil: iso(500) }),
  expired: () => ({ ...base, oneIdNumber: '1XX0000AD-004', fullName: 'Sample Member', status: 'active', validUntil: iso(-30) }),
  suspended: () => ({ ...base, oneIdNumber: '1XX0000AE-005', fullName: 'Sample Member', status: 'suspended', validUntil: iso(500) }),
};

const SCENARIOS: MockScenario[] = [
  { id: 'active', label: 'Active member', hint: 'Valid for over a year' },
  { id: 'expiring', label: 'Expiring soon', hint: 'Valid for 21 more days' },
  { id: 'pending', label: 'Pending confirmation', hint: 'Registered, not yet confirmed' },
  { id: 'expired', label: 'Expired', hint: 'Valid-until date has passed' },
  { id: 'suspended', label: 'Suspended', hint: 'Put on hold by the issuer' },
];

// Demo persistence only. The real link lives on the server; nothing here is trusted.
const key = (userId: number, what: string) => `khojasphere.mock.oneid.${what}.${userId}`;
const read = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable: demo state just won't persist */ } };
const remove = (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const mockProvider: OneIdAdapter = {
  mode: 'mock',
  scenarios: SCENARIOS,
  async getLinked(userId) {
    return read<OneIdProfile>(key(userId, 'profile'));
  },
  async startLink(userId, opts) {
    await wait();
    const make = PROFILES[opts?.scenario ?? 'active'] ?? PROFILES.active;
    const profile = { ...make(), linkedAt: new Date().toISOString() };
    write(key(userId, 'profile'), profile);
    return { kind: 'linked', profile };
  },
  async unlink(userId) {
    await wait(250);
    remove(key(userId, 'profile'));
    remove(key(userId, 'visibility'));
  },
  async startLogin() {
    return { kind: 'unavailable', message: 'Signing in with One ID will be available soon. For now, sign in with your email, then link your One ID from My Profile.' };
  },
  async getVisibility(userId) {
    return { ...DEFAULT_VISIBILITY, ...(read<OneIdVisibility>(key(userId, 'visibility')) ?? {}) };
  },
  async setVisibility(userId, v) {
    write(key(userId, 'visibility'), v);
    return v;
  },
};

/**
 * Demo-only: pretend some listing owners are linked, so badges are visible across the app.
 * Deterministic (same listing → same answer). Removed once the backend returns real `ownerOneId`.
 */
export function mockOwnerOneId(kind: string, id: number): OwnerOneId | null {
  // Every mentor shows as a Verified Jamaat Member (demo data)
  if (kind === 'mentor') return { verified: true, jamaat: 'Khoja Jamaat' };

  const k = kind === 'professional' ? 'business' : kind;
  const n = [...k].reduce((a, c) => a + c.charCodeAt(0), 0) + id * 7;
  if (n % 3 === 0) return null; // roughly a third of owners haven't linked
  return { verified: true, jamaat: n % 2 === 0 ? 'Khoja Jamaat' : 'Another Jamaat' };
}
