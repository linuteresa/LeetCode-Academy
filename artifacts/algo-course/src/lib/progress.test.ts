/**
 * Regression tests for progress handling.
 *
 * Run with `pnpm --filter @workspace/algo-course test`. These cover the rules
 * that are easy to break and expensive to get wrong: never letting one account
 * inherit another's progress, never resurrecting work the user undid, and the
 * streak's date arithmetic across month, leap-day and year boundaries.
 */
import {
  bookmarkKey,
  chooseProgress,
  emptyProgress,
  hasWork,
  noteRecent,
  normalizeProgress,
  reconcile,
  registerActivity,
  setStatusAt,
  statusKey,
  toggleBookmarkAt,
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
const anonStatuses = setStatusAt(emptyProgress, 'x', 'completed', 100);
check('a timestamped change beats an untimestamped one', reconcile(anonStatuses, account).statuses.x, 'completed');

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
const anon = setStatusAt(p({ ownerId: null }), 'two-sum', 'completed', 100);
const adopted = chooseProgress(anon, setStatusAt(emptyProgress, '3sum', 'in-progress', 50), A);
check('anonymous work is adopted', adopted.statuses, { 'two-sum': 'completed', '3sum': 'in-progress' });

// An undo that happened after the server's copy must stick.
const undoneLocally = setStatusAt(p({ ownerId: A }), 'two-sum', 'in-progress', 200);
const serverSaysCompleted = setStatusAt(emptyProgress, 'two-sum', 'completed', 100);
check('a newer undo is not resurrected', chooseProgress(undoneLocally, serverSaysCompleted, A).statuses['two-sum'], 'in-progress');

// ...and an older local copy must not clobber a newer server decision.
const staleLocal = setStatusAt(p({ ownerId: A }), 'two-sum', 'in-progress', 100);
const newerServer = setStatusAt(emptyProgress, 'two-sum', 'completed', 300);
check('a stale device does not clobber the server', chooseProgress(staleLocal, newerServer, A).statuses['two-sum'], 'completed');

// A removed bookmark must not come back from the other side.
const bookmarked = toggleBookmarkAt(p({ ownerId: A }), '3sum', 100);
const removed = toggleBookmarkAt(bookmarked, '3sum', 300);
const serverStillHasIt = toggleBookmarkAt(emptyProgress, '3sum', 100);
check('a newer un-bookmark sticks', chooseProgress(removed, serverStillHasIt, A).bookmarks, []);
check('an older un-bookmark loses to a newer add', chooseProgress(bookmarked, toggleBookmarkAt(emptyProgress, '3sum', 500), A).bookmarks, ['3sum']);

// Unsynced local work must survive a reload that hydrates from the server.
const offlineEdit = setStatusAt(p({ ownerId: A, recent: ['3sum'], lastActiveDate: '2026-09-18', streak: 5 }), '3sum', 'completed', 400);
const serverBehind = p({ statuses: {}, recent: [], lastActiveDate: null });
const afterReload = chooseProgress(offlineEdit, serverBehind, A);
check('unsynced local edit survives hydration', afterReload.statuses['3sum'], 'completed');
check('local recency survives hydration', afterReload.recent, ['3sum']);
check('local activity date survives hydration', afterReload.lastActiveDate, '2026-09-18');
check('streak is not reset by hydration', afterReload.streak, 5);

// Malformed but valid JSON must not reach the UI.
const junk = normalizeProgress({ bookmarks: null, statuses: { a: 'bogus', b: 'completed' }, streak: -3, recent: 'nope', updatedAt: { x: 'NaN' } });
check('null bookmarks become an array', junk.bookmarks, []);
check('unknown status values are dropped', junk.statuses, { b: 'completed' });
check('negative streak is rejected', junk.streak, 0);
check('non-array recent becomes an array', junk.recent, []);
check('non-numeric clock entries are dropped', junk.updatedAt, {});

// Clock keys are namespaced so a slug cannot collide across the two kinds.
check('status and bookmark keys differ', statusKey('x') === bookmarkKey('x'), false);

// An empty anonymous device just takes the server row.
check('empty device takes the row', chooseProgress(emptyProgress, bRow, B).statuses, { 'valid-anagram': 'in-progress' });

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
