import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  DEFAULT_VISIBILITY, ONE_ID_MODE, getOneIdState, oneIdAdapter,
  type MockScenario, type OneIdMode, type OneIdProfile, type OneIdState, type OneIdVisibility,
} from '../api/oneId';

interface OneIdContextValue {
  mode: OneIdMode;
  /** false when VITE_ONE_ID_MODE=off: the UI should render nothing One ID related */
  enabled: boolean;
  loading: boolean;
  profile: OneIdProfile | null;
  state: OneIdState;
  visibility: OneIdVisibility;
  scenarios: MockScenario[];
  error: string | null;
  link: (scenario?: string) => Promise<void>;
  unlink: () => Promise<void>;
  saveVisibility: (v: OneIdVisibility) => Promise<void>;
  startLogin: () => Promise<{ ok: boolean; message?: string }>;
}

const Ctx = createContext<OneIdContextValue | null>(null);

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export function OneIdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OneIdProfile | null>(null);
  const [visibility, setVisibility] = useState<OneIdVisibility>(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setVisibility(DEFAULT_VISIBILITY);
    setError(null);
    if (!oneIdAdapter || userId == null) return;
    setLoading(true);
    Promise.all([oneIdAdapter.getLinked(userId), oneIdAdapter.getVisibility(userId)])
      .then(([p, v]) => { if (alive) { setProfile(p); setVisibility(v); } })
      .catch((e) => { if (alive) setError(msg(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const link = useCallback(async (scenario?: string) => {
    if (!oneIdAdapter || userId == null) return;
    setError(null);
    try {
      const res = await oneIdAdapter.startLink(userId, { scenario });
      if (res.kind === 'redirect') { window.location.assign(res.url); return; }
      setProfile(res.profile);
    } catch (e) { setError(msg(e)); throw e; }
  }, [userId]);

  const unlink = useCallback(async () => {
    if (!oneIdAdapter || userId == null) return;
    setError(null);
    try {
      await oneIdAdapter.unlink(userId);
      setProfile(null);
      setVisibility(DEFAULT_VISIBILITY);
    } catch (e) { setError(msg(e)); throw e; }
  }, [userId]);

  const saveVisibility = useCallback(async (v: OneIdVisibility) => {
    if (!oneIdAdapter || userId == null) return;
    const prev = visibility;
    setVisibility(v); // optimistic
    try { setVisibility(await oneIdAdapter.setVisibility(userId, v)); }
    catch (e) { setVisibility(prev); setError(msg(e)); throw e; }
  }, [userId, visibility]);

  const startLogin = useCallback(async () => {
    if (!oneIdAdapter) return { ok: false, message: 'One ID is not enabled.' };
    try {
      const res = await oneIdAdapter.startLogin();
      if (res.kind === 'redirect') { window.location.assign(res.url); return { ok: true }; }
      return { ok: false, message: res.message };
    } catch (e) { return { ok: false, message: msg(e) }; }
  }, []);

  const value = useMemo<OneIdContextValue>(() => ({
    mode: ONE_ID_MODE, enabled: oneIdAdapter !== null, loading, profile, state: getOneIdState(profile),
    visibility, scenarios: oneIdAdapter?.scenarios ?? [], error, link, unlink, saveVisibility, startLogin,
  }), [loading, profile, visibility, error, link, unlink, saveVisibility, startLogin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOneId(): OneIdContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOneId must be used inside <OneIdProvider>');
  return v;
}
