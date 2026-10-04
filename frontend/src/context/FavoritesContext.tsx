import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { favorites, errorMessage, type EntityType, type FavoriteIds } from '../api';
import { useAuth } from './AuthContext';

const EMPTY: FavoriteIds = { business: [], property: [], marketplace: [] };

interface FavState {
  isSaved: (type: EntityType, id: number) => boolean;
  /** resolves 'auth' when the visitor must sign in first, 'error' on failure (see `error`), else 'ok' */
  toggle: (type: EntityType, id: number) => Promise<'ok' | 'auth' | 'error'>;
  ids: FavoriteIds;
  error: string | null;
  reload: () => void;
}
const Ctx = createContext<FavState | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<FavoriteIds>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!user) { setIds(EMPTY); return; }
    favorites.ids().then(setIds).catch(() => { /* keep what we have */ });
  }, [user]);
  useEffect(reload, [reload]);

  const isSaved = useCallback((t: EntityType, id: number) => ids[t].includes(id), [ids]);

  const toggle = useCallback(async (t: EntityType, id: number) => {
    if (!user) return 'auth' as const;
    const was = ids[t].includes(id);
    setError(null);
    setIds((p) => ({ ...p, [t]: was ? p[t].filter((x) => x !== id) : [id, ...p[t]] })); // optimistic
    try {
      if (was) await favorites.remove(t, id); else await favorites.add(t, id);
      return 'ok' as const;
    } catch (e) {
      setIds((p) => ({ ...p, [t]: was ? [id, ...p[t]] : p[t].filter((x) => x !== id) })); // roll back
      setError(errorMessage(e));
      return 'error' as const;
    }
  }, [user, ids]);

  const value = useMemo(() => ({ isSaved, toggle, ids, error, reload }), [isSaved, toggle, ids, error, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavorites(): FavState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return v;
}
