// One ID – shapes KhojaSphere uses internally.
// The real provider (World Federation One ID) is external; its responses are translated into these types
// in ONE place (see httpProvider.ts → mapOneIdToProfile) so the UI never depends on the provider's field names.

/** Status as reported by the One ID issuer. 'pending' = registered but not yet confirmed. */
export type OneIdIssuerStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface OneIdProfile {
  /** Opaque identifier shown on the member's card. Never parse it, never put it in a URL. */
  oneIdNumber: string;
  fullName: string;
  /** Provider-hosted photo. Kept separate from the KhojaSphere avatar; never imported automatically. */
  photoUrl?: string | null;
  jamaat: { name: string; logoUrl?: string | null };
  federation: { name: string; logoUrl?: string | null };
  status: OneIdIssuerStatus;
  /** ISO date (YYYY-MM-DD) until which the ID is valid. */
  validUntil: string;
  linkedAt?: string;
}

/**
 * What the UI actually renders. Always derived from the profile + today's date (see getOneIdState),
 * never stored, so an expired ID can't keep showing a "verified" badge.
 */
export type OneIdState = 'none' | 'pending' | 'active' | 'expiring' | 'expired' | 'inactive' | 'suspended';

/** What other members may see about a listing owner. Deliberately tiny. */
export interface OwnerOneId {
  verified: boolean;
  /** Only present if the owner chose to show their Jamaat. */
  jamaat?: string | null;
}

/** Privacy choices the member controls. Defaults are the most private that still make the badge useful. */
export interface OneIdVisibility {
  showBadge: boolean;
  showJamaat: boolean;
}
export const DEFAULT_VISIBILITY: OneIdVisibility = { showBadge: true, showJamaat: false };

export type LinkStartResult =
  /** Live mode: send the browser to the One ID sign-in page. */
  | { kind: 'redirect'; url: string }
  /** Mock mode: the link completed immediately. */
  | { kind: 'linked'; profile: OneIdProfile };

export type LoginStartResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'unavailable'; message: string };

export interface MockScenario { id: string; label: string; hint: string }
