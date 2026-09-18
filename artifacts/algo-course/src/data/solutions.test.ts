/**
 * Every published reference solution must be standalone, parseable JavaScript,
 * and the ones learners are most likely to copy must actually produce the right
 * answer. Several heap solutions previously called `new MinHeap()`, a class that
 * exists in no JavaScript runtime and was never shown.
 *
 * Run with `pnpm --filter @workspace/algo-course test`.
 */
import { neetcode150 } from './neetcode150';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
};

// 1. Everything parses, and nothing leans on an undefined helper class.
const unparseable: string[] = [];
const phantomClass: string[] = [];
for (const problem of neetcode150) {
  try {
    new Function(problem.solutionCode);
  } catch {
    unparseable.push(problem.slug);
  }
  for (const name of ['MinHeap', 'MaxHeap', 'ListNode', 'TreeNode']) {
    if (problem.solutionCode.includes(`new ${name}(`) && !problem.solutionCode.includes(`class ${name}`)) {
      phantomClass.push(`${problem.slug}:${name}`);
    }
  }
  try {
    new Function(problem.starterCode);
  } catch {
    unparseable.push(`${problem.slug} (starter)`);
  }
}
check('every solution and starter parses', unparseable, []);
check('no solution calls an undefined class', phantomClass, []);
check('the catalog is complete', neetcode150.length, 150);

// 2. Spot-check behaviour, weighted to the solutions that were broken.
const run = (slug: string, call: string, ...args: unknown[]) => {
  const problem = neetcode150.find((p) => p.slug === slug);
  if (!problem) throw new Error(`unknown slug ${slug}`);
  const fn = new Function(`${problem.solutionCode}\nreturn ${call};`)();
  return (fn as (...a: unknown[]) => unknown)(...args);
};

check('kth largest in an array', run('kth-largest-element-in-an-array', 'findKthLargest', [3, 2, 1, 5, 6, 4], 2), 5);
check('last stone weight', run('last-stone-weight', 'lastStoneWeight', [2, 7, 4, 1, 8, 1]), 1);
check('k closest points', (run('k-closest-points-to-origin', 'kClosest', [[1, 3], [-2, 2]], 1) as number[][]), [[-2, 2]]);
check('network delay time', run('network-delay-time', 'networkDelayTime', [[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2), 2);
check('network delay time, unreachable', run('network-delay-time', 'networkDelayTime', [[1, 2, 1]], 2, 2), -1);
check('min cost to connect points', run('min-cost-to-connect-all-points', 'minCostConnectPoints', [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]]), 20);
check('swim in rising water', run('swim-in-rising-water', 'swimInWater', [[0, 2], [1, 3]]), 3);
check('minimum interval per query', run('minimum-interval-to-include-each-query', 'minInterval', [[1, 4], [2, 4], [3, 6], [4, 4]], [2, 3, 4, 5]), [3, 3, 1, 4]);

// Sliding window maximum, after replacing shift() with a head pointer.
check('sliding window maximum', run('sliding-window-maximum', 'maxSlidingWindow', [1, 3, -1, -3, 5, 3, 6, 7], 3), [3, 3, 5, 5, 6, 7]);

// A spread of other patterns, so a bad edit anywhere gets caught.
check('two sum', run('two-sum', 'twoSum', [2, 7, 11, 15], 9), [0, 1]);
check('trapping rain water', run('trapping-rain-water', 'trap', [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), 6);
check('longest consecutive sequence', run('longest-consecutive-sequence', 'longestConsecutive', [100, 4, 200, 1, 3, 2]), 4);
check('coin change', run('coin-change', 'coinChange', [1, 2, 5], 11), 3);
check('edit distance', run('edit-distance', 'minDistance', 'horse', 'ros'), 3);
check('largest rectangle in histogram', run('largest-rectangle-in-histogram', 'largestRectangleArea', [2, 1, 5, 6, 2, 3]), 10);
check('regular expression matching', run('regular-expression-matching', 'isMatch', 'aab', 'c*a*b'), true);
check('burst balloons', run('burst-balloons', 'maxCoins', [3, 1, 5, 8]), 167);
check('word break', run('word-break', 'wordBreak', 'leetcode', ['leet', 'code']), true);
check('course schedule', run('course-schedule', 'canFinish', 2, [[1, 0]]), true);
check('course schedule, cyclic', run('course-schedule', 'canFinish', 2, [[1, 0], [0, 1]]), false);
check('median of two sorted arrays', run('median-of-two-sorted-arrays', 'findMedianSortedArrays', [1, 3], [2]), 2);
check('reverse integer overflow', run('reverse-integer', 'reverse', 1534236469), 0);
check('spiral matrix', run('spiral-matrix', 'spiralOrder', [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), [1, 2, 3, 6, 9, 8, 7, 4, 5]);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
