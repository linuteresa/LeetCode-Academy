import type { ProblemStatus } from '@/data/problems';

export type Persisted = {
  statuses: Record<string, ProblemStatus>;
  bookmarks: string[];
  lastSlug?: string;
  streak: number;
  /**
   * Which signed-in user this local copy belongs to, or null while anonymous.
   * Without this, signing out and signing in as someone else on the same
   * browser would fold the first person's progress into the second's account.
   */
  ownerId: string | null;
  /** Slugs touched most recently first. Device-local; not synced. */
  recent: string[];
  /** ISO date (YYYY-MM-DD) of the last day with activity, for the streak. */
  lastActiveDate: string | null;
};

export const STORAGE_KEY = 'algocourse-progress-v1';

export const RECENT_LIMIT = 8;

export const emptyProgress: Persisted = {
  statuses: {},
  bookmarks: [],
  streak: 0,
  ownerId: null,
  recent: [],
  lastActiveDate: null,
};

export function readLocalProgress(): Persisted {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...emptyProgress, ...(JSON.parse(saved) as Partial<Persisted>) };
  } catch {
    /* a blocked or corrupt store just means we start fresh */
  }
  return emptyProgress;
}

/** Returns false when the write was rejected, so the UI can stop claiming it saved. */
export function writeLocalProgress(progress: Persisted): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    // Private mode and full quotas are not worth interrupting a lesson for,
    // but the caller needs to know the claim "saved on this device" is false.
    return false;
  }
}

export function clearLocalProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing useful to do if the store refuses us */
  }
}

/** True when there is anything worth carrying into an account. */
export function hasWork(progress: Persisted): boolean {
  return Object.keys(progress.statuses).length > 0 || progress.bookmarks.length > 0;
}

const rank: Record<ProblemStatus, number> = {
  'not-started': 0,
  'in-progress': 1,
  completed: 2,
};

/**
 * Fold anonymous work into an account's progress on first sign-in.
 *
 * This deliberately never moves a problem backwards, which is right for
 * adopting unclaimed work but wrong as a general sync rule -- it would
 * resurrect a completion the user had undone. It is only used when the local
 * copy has no owner; once a device belongs to an account, the server row wins.
 */
export function mergeProgress(account: Persisted, anonymous: Persisted): Persisted {
  const statuses: Record<string, ProblemStatus> = { ...account.statuses };
  for (const [slug, status] of Object.entries(anonymous.statuses)) {
    const current = statuses[slug];
    if (!current || rank[status] > rank[current]) statuses[slug] = status;
  }

  return {
    ...account,
    statuses,
    bookmarks: [...new Set([...account.bookmarks, ...anonymous.bookmarks])],
    streak: Math.max(account.streak, anonymous.streak),
    lastSlug: anonymous.lastSlug ?? account.lastSlug,
    recent: [...new Set([...anonymous.recent, ...account.recent])].slice(0, RECENT_LIMIT),
    lastActiveDate:
      (account.lastActiveDate ?? '') > (anonymous.lastActiveDate ?? '')
        ? account.lastActiveDate
        : anonymous.lastActiveDate,
  };
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function previousDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return todayISO(date);
}

/**
 * Record that the user did something today and move the streak accordingly:
 * same day changes nothing, the day after extends it, any longer gap restarts.
 */
export function registerActivity(progress: Persisted, today: string = todayISO()): Persisted {
  if (progress.lastActiveDate === today) return progress;

  const streak = progress.lastActiveDate === previousDay(today) ? progress.streak + 1 : 1;
  return { ...progress, streak, lastActiveDate: today };
}

/** Move a slug to the front of the recently-worked-on list. */
export function noteRecent(progress: Persisted, slug: string): Persisted {
  return {
    ...progress,
    recent: [slug, ...progress.recent.filter((item) => item !== slug)].slice(0, RECENT_LIMIT),
  };
}

/**
 * Decide what a signed-in session should start from.
 *
 * The device copy is only trusted when it demonstrably belongs to this user, or
 * when it is unclaimed work done before signing in. Anything else -- most
 * importantly a copy left behind by a different account on a shared browser --
 * is discarded rather than merged, so one person's progress can never leak into
 * another's row.
 */
export function chooseProgress(
  local: Persisted,
  remote: Persisted | null,
  userId: string,
): Persisted {
  if (local.ownerId === null && hasWork(local)) {
    const adopted = remote ? mergeProgress(remote, local) : local;
    return { ...adopted, ownerId: userId };
  }
  if (local.ownerId === userId) {
    return { ...(remote ?? local), ownerId: userId };
  }
  return { ...(remote ?? emptyProgress), ownerId: userId };
}
