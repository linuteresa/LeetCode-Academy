import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProblemStatus } from '@/data/problems';
import { supabase } from '@/lib/supabase';
import {
  chooseProgress,
  clearLocalProgress,
  emptyProgress,
  noteRecent,
  normalizeProgress,
  readLocalProgress,
  registerActivity,
  setNoteAt,
  setStatusAt,
  toggleBookmarkAt,
  writeLocalProgress,
  type ChangeClock,
  type Persisted,
} from '@/lib/progress';

/**
 * The row as stored. `statuses` and `bookmarks` are jsonb, so the per-change
 * clock rides along inside them and needs no extra column.
 */
type ProgressRow = {
  statuses: Record<string, ProblemStatus> | null;
  bookmarks: string[] | { list?: string[]; at?: ChangeClock; notes?: Record<string, string> } | null;
  streak: number | null;
  last_slug: string | null;
};

export type SyncState = 'local' | 'syncing' | 'synced' | 'error' | 'no-storage';

const PUSH_DEBOUNCE_MS = 800;

function rowToProgress(row: ProgressRow): Persisted {
  // Rows written before per-change timestamps stored a plain string[]; those
  // entries simply carry no clock and lose to anything newer.
  const bookmarks = Array.isArray(row.bookmarks) ? row.bookmarks : (row.bookmarks?.list ?? []);
  const updatedAt = Array.isArray(row.bookmarks) ? {} : (row.bookmarks?.at ?? {});
  const notes = Array.isArray(row.bookmarks) ? {} : (row.bookmarks?.notes ?? {});

  return normalizeProgress({
    statuses: row.statuses ?? {},
    bookmarks,
    notes,
    updatedAt,
    streak: row.streak ?? 0,
    lastSlug: row.last_slug ?? undefined,
  });
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
      const remote = data ? rowToProgress(data as ProgressRow) : null;

      hydratedFor.current = userId;
      setProgress(chooseProgress(local, remote, userId));
      setSyncState('synced');
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // localStorage stays authoritative for a signed-out session and is a useful
  // offline cache for a signed-in one, so it is always written.
  useEffect(() => {
    if (!writeLocalProgress(progress)) setSyncState('no-storage');
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
          // `bookmarks` is jsonb, so the clock and the notes ride inside it
          // and need no extra column. See SYNC.md.
          bookmarks: { list: progress.bookmarks, at: progress.updatedAt, notes: progress.notes },
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
    setProgress((p) => registerActivity(noteRecent(setStatusAt(p, slug, status), slug)));
  }, []);

  /** Flip a problem between solved and in progress. */
  const toggleSolved = useCallback((slug: string, solved: boolean) => {
    setProgress((p) =>
      registerActivity(noteRecent(setStatusAt(p, slug, solved ? 'completed' : 'in-progress'), slug)),
    );
  }, []);

  const setNote = useCallback((slug: string, text: string) => {
    setProgress((p) => setNoteAt(p, slug, text));
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setProgress((p) => toggleBookmarkAt(p, slug));
  }, []);

  /**
   * Record that a lesson was opened, without changing its status. Returning to
   * an in-progress lesson is real activity: it should extend the streak and
   * move the lesson to the front of the recent list.
   */
  const visit = useCallback((slug: string) => {
    setProgress((p) => {
      const next = registerActivity(noteRecent({ ...p, lastSlug: slug }, slug));
      return next === p ? p : next;
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      // BASE_URL matters on GitHub Pages, where the app is served from a
      // subpath (/LeetCode-Academy/) rather than the origin root.
      options: { redirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString() },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // The account's progress is safely on the server. Wiping the device copy
    // keeps it off the screen for whoever uses this browser next.
    hydratedFor.current = null;
    clearLocalProgress();
    setProgress(emptyProgress);
    setSyncState('local');
  }, []);

  return {
    progress,
    setStatus,
    toggleSolved,
    setNote,
    toggleBookmark,
    visit,
    session,
    authReady,
    syncState,
    signInWithGoogle,
    signOut,
  };
}
