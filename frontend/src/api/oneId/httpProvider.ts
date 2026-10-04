import type { OneIdAdapter } from './provider';
import type { OneIdProfile } from './types';

/**
 * FUTURE: real integration. Nothing here talks to the World Federation directly; the browser only ever
 * talks to the KhojaSphere backend, which holds the One ID credentials and tokens.
 *
 * Planned backend routes (not built yet – names are a proposal):
 *   GET    /auth/one-id/start?intent=login|link   → { url }   (OIDC authorization-code + PKCE redirect)
 *   GET    /auth/one-id/callback                  → server-side; ends by redirecting back to the app
 *   GET    /users/me/one-id                       → linked profile or 404
 *   DELETE /users/me/one-id                       → unlink
 *   GET/PUT /users/me/one-id/visibility           → privacy choices
 */
const notReady = () => new Error('One ID is not connected yet. Set VITE_ONE_ID_MODE=mock for the demo.');

/** The single place provider field names are translated into KhojaSphere's OneIdProfile. Adjust when the real spec is known. */
export function mapOneIdToProfile(_raw: unknown): OneIdProfile {
  throw notReady();
}

export const httpProvider: OneIdAdapter = {
  mode: 'live',
  getLinked: async () => { throw notReady(); },
  startLink: async () => { throw notReady(); },
  unlink: async () => { throw notReady(); },
  startLogin: async () => { throw notReady(); },
  getVisibility: async () => { throw notReady(); },
  setVisibility: async () => { throw notReady(); },
};
