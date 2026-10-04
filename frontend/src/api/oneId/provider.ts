import type { LinkStartResult, LoginStartResult, MockScenario, OneIdProfile, OneIdVisibility } from './types';

/**
 * Everything the UI needs from One ID. Two implementations exist:
 *  - mockProvider  (demo / development, no network)
 *  - httpProvider  (future: talks to the KhojaSphere backend, which talks to One ID)
 * Components never import either directly; they go through OneIdContext.
 */
export interface OneIdAdapter {
  readonly mode: 'mock' | 'live';
  /** Currently linked One ID for this KhojaSphere user, or null. */
  getLinked(userId: number): Promise<OneIdProfile | null>;
  startLink(userId: number, opts?: { scenario?: string }): Promise<LinkStartResult>;
  unlink(userId: number): Promise<void>;
  /** "Continue with One ID" on the sign-in screen. */
  startLogin(): Promise<LoginStartResult>;
  getVisibility(userId: number): Promise<OneIdVisibility>;
  setVisibility(userId: number, v: OneIdVisibility): Promise<OneIdVisibility>;
  /** Mock only: test members the link flow can pretend to be. */
  scenarios?: MockScenario[];
}
