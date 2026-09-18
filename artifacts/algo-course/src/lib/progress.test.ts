/**
 * Regression tests for progress handling.
 *
 * Run with `pnpm --filter @workspace/algo-course test`. These cover the rules
 * that are easy to break and expensive to get wrong: never letting one account
 * inherit another's progress, never resurrecting work the user undid, and the
 * streak's date arithmetic across month, leap-day and year boundaries.
 */
import {
  chooseProgress,
  emptyProgress,
  hasWork,
  mergeProgress,
  noteRecent,
  registerActivity,
  todayISO,
  type Persisted,
} from './progress';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
};

// Streak: first activity, consecutive day, same day, gap.
const first = registerActivity(emptyProgress, '2026-03-10');
check('first activity starts at 1', first.streak, 1);
check('consecutive day extends', registerActivity(first, '2026-03-11').streak, 2);
check('same day is a no-op', registerActivity(first, '2026-03-10').streak, 1);
check('a gap restarts', registerActivity(first, '2026-03-12').streak, 1);

// Boundaries, where naive date maths breaks.
// 2026 is not a leap year, so Feb 28 -> Mar 1 is consecutive.
const endOfMonth = registerActivity(emptyProgress, '2026-02-28');
check('month boundary extends', registerActivity(endOfMonth, '2026-03-01').streak, 2);
check('month boundary with a gap restarts', registerActivity(endOfMonth, '2026-03-02').streak, 1);
const leap = registerActivity(emptyProgress, '2024-02-28');
check('leap day extends', registerActivity(leap, '2024-02-29').streak, 2);
const newYearsEve = registerActivity(emptyProgress, '2025-12-31');
check('year boundary extends', registerActivity(newYearsEve, '2026-01-01').streak, 2);

// todayISO must be local-time, not UTC, or late-evening users skip a day.
check('todayISO pads', todayISO(new Date(2026, 0, 5)), '2026-01-05');
check('todayISO late evening stays local', todayISO(new Date(2026, 0, 5, 23, 30)), '2026-01-05');

// Recency is most-recent-first and de-duplicates.
let mru = noteRecent(emptyProgress, 'a');
mru = noteRecent(mru, 'b');
mru = noteRecent(mru, 'a');
check('recent is MRU order', mru.recent, ['a', 'b']);

// Anonymous adoption still wins forward, and hasWork gates it.
check('empty progress has no work', hasWork(emptyProgress), false);
check('a bookmark counts as work', hasWork({ ...emptyProgress, bookmarks: ['x'] }), true);
const account = { ...emptyProgress, statuses: { x: 'in-progress' as const } };
const anonStatuses = { ...emptyProgress, statuses: { x: 'completed' as const } };
check('adoption takes the further status', mergeProgress(account, anonStatuses).statuses.x, 'completed');

const A = 'user-a', B = 'user-b';
const p = (over: Partial<Persisted>): Persisted => ({ ...emptyProgress, ...over });

// THE CRITICAL ONE: A signs out, B signs in on the same browser.
const leftBehindByA = p({ ownerId: A, statuses: { 'two-sum': 'completed' }, bookmarks: ['3sum'] });
const bRow = p({ statuses: { 'valid-anagram': 'in-progress' } });
const forB = chooseProgress(leftBehindByA, bRow, B);
check("B does not inherit A's statuses", forB.statuses, { 'valid-anagram': 'in-progress' });
check("B does not inherit A's bookmarks", forB.bookmarks, []);
check('B owns the result', forB.ownerId, B);

// Same, but B has never saved anything: must be empty, not A's data.
const forBNoRow = chooseProgress(leftBehindByA, null, B);
check('B with no row starts clean', forBNoRow.statuses, {});
check('B with no row has no bookmarks', forBNoRow.bookmarks, []);

// Anonymous work before signing in is still adopted (the feature must survive).
const anon = p({ ownerId: null, statuses: { 'two-sum': 'completed' } });
const adopted = chooseProgress(anon, p({ statuses: { '3sum': 'in-progress' } }), A);
check('anonymous work is adopted', adopted.statuses, { '3sum': 'in-progress', 'two-sum': 'completed' });

// Returning user: the server row wins, so an undone completion stays undone.
const staleLocal = p({ ownerId: A, statuses: { 'two-sum': 'completed' } });
const serverSaysInProgress = p({ statuses: { 'two-sum': 'in-progress' } });
check('undo is not resurrected', chooseProgress(staleLocal, serverSaysInProgress, A).statuses['two-sum'], 'in-progress');

// Removing a bookmark also sticks for a returning user.
const localWithBookmark = p({ ownerId: A, bookmarks: ['3sum'] });
check('removed bookmark stays removed', chooseProgress(localWithBookmark, p({ bookmarks: [] }), A).bookmarks, []);

// An empty anonymous device just takes the server row.
check('empty device takes the row', chooseProgress(emptyProgress, bRow, B).statuses, { 'valid-anagram': 'in-progress' });

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
