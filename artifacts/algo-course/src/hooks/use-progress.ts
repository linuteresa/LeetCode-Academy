import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProblemStatus } from '@/data/problems';
import { supabase } from '@/lib/supabase';
import {
  mergeProgress,
  readLocalProgress,
  writeLocalProgress,
  type Persisted,
} from '@/lib/progress';

type ProgressRow = {
  statuses: Record<string, ProblemStatus> | null;
  bookmarks: string[] | null;
  streak: number | null;
  last_slug: string | null;
};

export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

const PUSH_DEBOUNCE_MS = 800;

function rowToProgress(row: ProgressRow): Persisted {
  return {
    statuses: row.statuses ?? {},
    bookmarks: row.bookmarks ?? [],
    streak: row.streak ?? 0,
    lastSlug: row.last_slug ?? undefined,
  };
}

/**
 * Progress state for the whole app.
 *
 * Signed out, this behaves exactly as it always has: state in memory, mirrored
 * to localStorage. Signed in, the local copy is merged with the row in Supabase
 * once on sign-in, and every change after that is pushed to that row, so
 * progress follows the learner between devices.
 */
export function useProgress() {
  const [progress, setProgress] = useState<Persisted>(readLocalProgress);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [syncState, setSyncState] = useState<SyncState>('local');

  // The user whose remote row we have already merged in; pushes are held back
  // until this matches the signed-in user, so we never overwrite a real row
  // with a not-yet-hydrated local one.
  const hydratedFor = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
      if (!next) hydratedFor.current = null;
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Pull the remote row once per sign-in and fold the local copy into it.
  useEffect(() => {
    if (!supabase || !userId || hydratedFor.current === userId) return;
    let cancelled = false;
    setSyncState('syncing');

    (async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('statuses, bookmarks, streak, last_slug')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setSyncState('error');
        return;
      }

      const local = readLocalProgress();
      const merged = data ? mergeProgress(rowToProgress(data as ProgressRow), local) : local;

      hydratedFor.current = userId;
      setProgress(merged);
      setSyncState('synced');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // localStorage stays authoritative for a signed-out session and is a useful
  // offline cache for a signed-in one, so it is always written.
  useEffect(() => {
    writeLocalProgress(progress);
  }, [progress]);

  // Push to Supabase, debounced so a burst of clicks is one round trip.
  useEffect(() => {
    const client = supabase;
    if (!client || !userId || hydratedFor.current !== userId) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setSyncState('syncing');
      const { error } = await client.from('progress').upsert(
        {
          user_id: userId,
          statuses: progress.statuses,
          bookmarks: progress.bookmarks,
          streak: progress.streak,
          last_slug: progress.lastSlug ?? null,
        },
        { onConflict: 'user_id' },
      );
      setSyncState(error ? 'error' : 'synced');
    }, PUSH_DEBOUNCE_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [progress, userId]);

  const setStatus = useCallback((slug: string, status: ProblemStatus) => {
    setProgress((p) => ({ ...p, statuses: { ...p.statuses, [slug]: status }, lastSlug: slug }));
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setProgress((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(slug)
        ? p.bookmarks.filter((item) => item !== slug)
        : [...p.bookmarks, slug],
    }));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSyncState('local');
  }, []);

  return {
    progress,
    setStatus,
    toggleBookmark,
    session,
    authReady,
    syncState,
    signInWithGoogle,
    signOut,
  };
}
