import type { ProblemStatus } from '@/data/problems';

/**
 * Per-change timestamps, keyed by `s:<slug>` for a status and `b:<slug>` for a
 * bookmark. They are what let two devices reconcile field by field instead of
 * one whole object clobbering the other.
 */
export type ChangeClock = Record<string, number>;

export const statusKey = (slug: string) => `s:${slug}`;
export const bookmarkKey = (slug: string) => `b:${slug}`;
export const noteKey = (slug: string) => `n:${slug}`;

export type Persisted = {
  statuses: Record<string, ProblemStatus>;
  bookmarks: string[];
  /** Free-text notes per problem. An empty note is removed rather than stored. */
  notes: Record<string, string>;
  lastSlug?: string;
  streak: number;
  /**
   * Which signed-in user this local copy belongs to, or null while anonymous.
   * Without this, signing out and signing in as someone else on the same
   * browser would fold the first person's progress into the second's account.
   */
  ownerId: string | null;
  /** Slugs touched most recently first. Device-local; see SYNC.md. */
  recent: string[];
  /** ISO date (YYYY-MM-DD) of the last day with activity, for the streak. */
  lastActiveDate: string | null;
  updatedAt: ChangeClock;
};

export const STORAGE_KEY = 'algocourse-progress-v1';

export const RECENT_LIMIT = 8;

export const emptyProgress: Persisted = {
  statuses: {},
  bookmarks: [],
  notes: {},
  streak: 0,
  ownerId: null,
  recent: [],
  lastActiveDate: null,
  updatedAt: {},
};

const STATUSES: ProblemStatus[] = ['not-started', 'in-progress', 'completed'];

/**
 * Coerce anything that came out of storage or the network into a usable shape.
 *
 * Parsed JSON is not the same as valid data: a hand-edited entry, a half-written
 * record or an older release can all produce well-formed JSON with the wrong
 * types, and `bookmarks: null` would then blow up on `.includes()`.
 */
export function normalizeProgress(raw: unknown): Persisted {
  const input = (raw ?? {}) as Record<string, unknown>;

  const statuses: Record<string, ProblemStatus> = {};
  const rawStatuses = input.statuses;
  if (rawStatuses && typeof rawStatuses === 'object' && !Array.isArray(rawStatuses)) {
    for (const [slug, value] of Object.entries(rawStatuses as Record<string, unknown>)) {
      if (typeof value === 'string' && (STATUSES as string[]).includes(value)) {
        statuses[slug] = value as ProblemStatus;
      }
    }
  }

  const bookmarks = Array.isArray(input.bookmarks)
    ? [...new Set(input.bookmarks.filter((s): s is string => typeof s === 'string'))]
    : [];

  const updatedAt: ChangeClock = {};
  const rawClock = input.updatedAt;
  if (rawClock && typeof rawClock === 'object' && !Array.isArray(rawClock)) {
    for (const [key, value] of Object.entries(rawClock as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) updatedAt[key] = value;
    }
  }

  const notes: Record<string, string> = {};
  const rawNotes = input.notes;
  if (rawNotes && typeof rawNotes === 'object' && !Array.isArray(rawNotes)) {
    for (const [slug, value] of Object.entries(rawNotes as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) notes[slug] = value;
    }
  }

  const recent = Array.isArray(input.recent)
    ? [...new Set(input.recent.filter((s): s is string => typeof s === 'string'))].slice(0, RECENT_LIMIT)
    : [];

  return {
    statuses,
    bookmarks,
    notes,
    updatedAt,
    recent,
    streak: typeof input.streak === 'number' && input.streak >= 0 ? input.streak : 0,
    lastSlug: typeof input.lastSlug === 'string' ? input.lastSlug : undefined,
    ownerId: typeof input.ownerId === 'string' ? input.ownerId : null,
    lastActiveDate: typeof input.lastActiveDate === 'string' ? input.lastActiveDate : null,
  };
}

export function readLocalProgress(): Persisted {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeProgress(JSON.parse(saved));
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
  return (
    Object.keys(progress.statuses).length > 0 ||
    progress.bookmarks.length > 0 ||
    Object.keys(progress.notes).length > 0
  );
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

export function setStatusAt(
  progress: Persisted,
  slug: string,
  status: ProblemStatus,
  at: number = Date.now(),
): Persisted {
  return {
    ...progress,
    statuses: { ...progress.statuses, [slug]: status },
    lastSlug: slug,
    updatedAt: { ...progress.updatedAt, [statusKey(slug)]: at },
  };
}

/**
 * Write a note, or clear it when the text is blank. Cleared notes are removed
 * rather than stored empty, but keep a timestamp so the removal can win a
 * reconcile instead of the old text coming back.
 */
export function setNoteAt(
  progress: Persisted,
  slug: string,
  text: string,
  at: number = Date.now(),
): Persisted {
  const notes = { ...progress.notes };
  if (text.trim()) notes[slug] = text;
  else delete notes[slug];

  return {
    ...progress,
    notes,
    updatedAt: { ...progress.updatedAt, [noteKey(slug)]: at },
  };
}

export function toggleBookmarkAt(
  progress: Persisted,
  slug: string,
  at: number = Date.now(),
): Persisted {
  const on = !progress.bookmarks.includes(slug);
  return {
    ...progress,
    bookmarks: on ? [...progress.bookmarks, slug] : progress.bookmarks.filter((s) => s !== slug),
    // The timestamp is kept for a removal too, so the removal itself can win a
    // reconcile instead of the bookmark reappearing from the other side.
    updatedAt: { ...progress.updatedAt, [bookmarkKey(slug)]: at },
  };
}

/**
 * Reconcile two copies of the same account's progress, field by field.
 *
 * Whole-object last-writer-wins loses data whenever two tabs, two devices, or
 * an offline edit and a stale server row disagree. Comparing per-change
 * timestamps means the newest decision for each individual problem survives,
 * whichever side it came from -- including a deliberate un-complete or an
 * un-bookmark, which a "furthest wins" union would resurrect.
 */
export function reconcile(local: Persisted, remote: Persisted): Persisted {
  const statuses: Record<string, ProblemStatus> = {};
  const updatedAt: ChangeClock = { ...remote.updatedAt, ...local.updatedAt };

  for (const slug of new Set([...Object.keys(local.statuses), ...Object.keys(remote.statuses)])) {
    const key = statusKey(slug);
    const localAt = local.updatedAt[key] ?? 0;
    const remoteAt = remote.updatedAt[key] ?? 0;
    const winner = localAt >= remoteAt ? local : remote;
    const status = winner.statuses[slug] ?? local.statuses[slug] ?? remote.statuses[slug];
    if (status) statuses[slug] = status;
    updatedAt[key] = Math.max(localAt, remoteAt);
  }

  const bookmarks: string[] = [];
  for (const slug of new Set([...local.bookmarks, ...remote.bookmarks])) {
    const key = bookmarkKey(slug);
    const localAt = local.updatedAt[key] ?? 0;
    const remoteAt = remote.updatedAt[key] ?? 0;
    const winner = localAt >= remoteAt ? local : remote;
    if (winner.bookmarks.includes(slug)) bookmarks.push(slug);
    updatedAt[key] = Math.max(localAt, remoteAt);
  }

  const notes: Record<string, string> = {};
  for (const slug of new Set([...Object.keys(local.notes), ...Object.keys(remote.notes)])) {
    const key = noteKey(slug);
    const localAt = local.updatedAt[key] ?? 0;
    const remoteAt = remote.updatedAt[key] ?? 0;
    const winner = localAt >= remoteAt ? local : remote;
    const text = winner.notes[slug];
    if (text) notes[slug] = text;
    updatedAt[key] = Math.max(localAt, remoteAt);
  }

  const lastActiveDate =
    (local.lastActiveDate ?? '') >= (remote.lastActiveDate ?? '')
      ? local.lastActiveDate
      : remote.lastActiveDate;

  return {
    statuses,
    bookmarks,
    notes,
    updatedAt,
    streak: Math.max(local.streak, remote.streak),
    lastSlug: local.lastSlug ?? remote.lastSlug,
    ownerId: local.ownerId ?? remote.ownerId,
    // Recency and activity dates are not stored server-side yet, so the device
    // copy is authoritative and must never be wiped by a hydrate. See SYNC.md.
    recent: local.recent.length ? local.recent : remote.recent,
    lastActiveDate,
  };
}

/**
 * Decide what a signed-in session should start from.
 *
 * A copy left behind by a different account is discarded outright, so one
 * person's progress can never leak into another's row. Otherwise the two copies
 * are reconciled per change, which keeps newer local edits that have not been
 * uploaded yet -- a reload before the debounce fires, or work done offline.
 */
export function chooseProgress(
  local: Persisted,
  remote: Persisted | null,
  userId: string,
): Persisted {
  const belongsToSomeoneElse = local.ownerId !== null && local.ownerId !== userId;
  const mine = belongsToSomeoneElse ? { ...emptyProgress } : local;

  if (!remote) return { ...mine, ownerId: userId };
  return { ...reconcile(mine, remote), ownerId: userId };
}
