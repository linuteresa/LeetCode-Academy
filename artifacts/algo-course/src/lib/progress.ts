import type { ProblemStatus } from '@/data/problems';

export type Persisted = {
  statuses: Record<string, ProblemStatus>;
  bookmarks: string[];
  lastSlug?: string;
  streak: number;
};

export const STORAGE_KEY = 'algocourse-progress-v1';

export const emptyProgress: Persisted = { statuses: {}, bookmarks: [], streak: 4 };

export function readLocalProgress(): Persisted {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...emptyProgress, ...(JSON.parse(saved) as Partial<Persisted>) };
  } catch {
    /* a blocked or corrupt store just means we start fresh */
  }
  return emptyProgress;
}

export function writeLocalProgress(progress: Persisted): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* private mode and full quotas are not worth interrupting a lesson for */
  }
}

const rank: Record<ProblemStatus, number> = {
  'not-started': 0,
  'in-progress': 1,
  completed: 2,
};

/**
 * Combine two copies of a learner's progress without ever moving a problem
 * backwards. Used when signing in on a device that already has local work:
 * the furthest-along status wins, bookmarks union, and the longer streak holds.
 */
export function mergeProgress(a: Persisted, b: Persisted): Persisted {
  const statuses: Record<string, ProblemStatus> = { ...a.statuses };
  for (const [slug, status] of Object.entries(b.statuses)) {
    const current = statuses[slug];
    if (!current || rank[status] > rank[current]) statuses[slug] = status;
  }

  return {
    statuses,
    bookmarks: [...new Set([...a.bookmarks, ...b.bookmarks])],
    streak: Math.max(a.streak, b.streak),
    lastSlug: b.lastSlug ?? a.lastSlug,
  };
}
