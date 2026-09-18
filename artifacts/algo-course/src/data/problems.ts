export type ProblemStatus = 'not-started' | 'in-progress' | 'completed';

export type LessonStep = {
  kind: 'concept' | 'visual' | 'checkpoint' | 'practice';
  title: string;
  subtitle: string;
  body?: string;
};

export type Problem = {
  slug: string;
  title: string;
  number: number;
  pattern: string;
  difficulty: 'Medium';
  estimatedMinutes: number;
  summary: string;
  tags: string[];
  status: ProblemStatus;
  steps: LessonStep[];
  prompt: string;
  hints: string[];
  starterCode: string;
  solutionCode: string;
  complexity: { time: string; space: string };
  checkpoint: { question: string; choices: string[]; answer: number };
};

const sharedSteps = (concept: string, visual: string): LessonStep[] => [
  { kind: 'concept', title: 'Spot the pattern', subtitle: 'The idea before the syntax', body: concept },
  { kind: 'visual', title: 'Build a mental model', subtitle: 'Watch the invariant hold', body: visual },
  { kind: 'checkpoint', title: 'Quick checkpoint', subtitle: 'Make the next move yourself' },
  { kind: 'practice', title: 'Put it into code', subtitle: 'A clean implementation, then your turn' },
];

export const problems: Problem[] = [
  {
    slug: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', number: 3, pattern: 'Sliding window', difficulty: 'Medium', estimatedMinutes: 18,
    summary: 'Find the longest run of unique characters in one pass.', tags: ['strings', 'hash map', 'window'],
    status: 'not-started', steps: sharedSteps('A window is a range we keep valid while scanning. When a duplicate enters, move the left edge just past its previous position; there is no reason to revisit safe characters.', 'The right edge keeps moving. The left edge only moves forward, so every character is visited at most twice. The window is always duplicate-free.'),
    prompt: 'Given a string s, find the length of the longest substring without repeating characters.', hints: ['Track the last index where each character was seen.', 'When a repeated character is inside the window, jump left forward.', 'Update the best length after each right-edge move.'],
    starterCode: 'function lengthOfLongestSubstring(s) {\\n  // your code\\n}',
    solutionCode: 'function lengthOfLongestSubstring(s) {\\n  const lastSeen = new Map();\\n  let left = 0;\\n  let best = 0;\\n\\n  for (let right = 0; right < s.length; right++) {\\n    if (lastSeen.has(s[right])) {\\n      left = Math.max(left, lastSeen.get(s[right]) + 1);\\n    }\\n    lastSeen.set(s[right], right);\\n    best = Math.max(best, right - left + 1);\\n  }\\n  return best;\\n}',
    complexity: { time: 'O(n)', space: 'O(min(n, alphabet))' }, checkpoint: { question: 'What should the left edge do when a duplicate appears?', choices: ['Reset to index 0', 'Move just past the duplicate’s last index', 'Move one place right'], answer: 1 },
  },
  {
    slug: 'container-with-most-water', title: 'Container With Most Water', number: 11, pattern: 'Two pointers', difficulty: 'Medium', estimatedMinutes: 14,
    summary: 'Choose two lines that hold the most water without checking every pair.', tags: ['arrays', 'greedy', 'pointers'], status: 'not-started',
    steps: sharedSteps('The area is limited by the shorter wall. With two pointers at the ends, moving the taller wall cannot help: the shorter wall remains the bottleneck and the width shrinks.', 'Start wide, then discard the shorter side. The only chance to improve is to find a taller wall on that side; each pointer crosses the array once.'),
    prompt: 'Given n non-negative integers where each represents a vertical line, find two lines that form a container with the most water.', hints: ['Area = width × shorter height.', 'Move the pointer at the shorter line.', 'Keep the maximum area seen.'], starterCode: 'function maxArea(height) {\\n  // your code\\n}', solutionCode: 'function maxArea(height) {\\n  let left = 0, right = height.length - 1;\\n  let best = 0;\\n  while (left < right) {\\n    const width = right - left;\\n    best = Math.max(best, width * Math.min(height[left], height[right]));\\n    if (height[left] < height[right]) left++;\\n    else right--;\\n  }\\n  return best;\\n}', complexity: { time: 'O(n)', space: 'O(1)' }, checkpoint: { question: 'Which pointer can be safely moved?', choices: ['The taller pointer', 'The shorter pointer', 'Either, randomly'], answer: 1 },
  },
  {
    slug: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array', number: 33, pattern: 'Binary search', difficulty: 'Medium', estimatedMinutes: 22,
    summary: 'Use sorted halves to search an array that has been rotated.', tags: ['arrays', 'divide and conquer'], status: 'not-started',
    steps: sharedSteps('A rotated sorted array always has at least one sorted half. Compare the target to that half’s boundaries to decide whether to search it or the other half.', 'At every midpoint, one side is ordered. Keep the half where the target can still exist and discard the other half.',),
    prompt: 'Given a rotated sorted array of unique values and a target, return its index or -1 if it does not exist.', hints: ['Compare left, mid, and right to identify the sorted half.', 'Check whether target lies within sorted half bounds.', 'Shrink the search interval every iteration.'], starterCode: 'function search(nums, target) {\\n  // your code\\n}', solutionCode: 'function search(nums, target) {\\n  let left = 0, right = nums.length - 1;\\n  while (left <= right) {\\n    const mid = Math.floor((left + right) / 2);\\n    if (nums[mid] === target) return mid;\\n    if (nums[left] <= nums[mid]) {\\n      if (nums[left] <= target && target < nums[mid]) right = mid - 1;\\n      else left = mid + 1;\\n    } else if (nums[mid] < target && target <= nums[right]) left = mid + 1;\\n    else right = mid - 1;\\n  }\\n  return -1;\\n}', complexity: { time: 'O(log n)', space: 'O(1)' }, checkpoint: { question: 'What is guaranteed around any midpoint?', choices: ['Both halves are sorted', 'At least one half is sorted', 'The target is nearby'], answer: 1 },
  },
  {
    slug: 'merge-intervals', title: 'Merge Intervals', number: 56, pattern: 'Intervals', difficulty: 'Medium', estimatedMinutes: 16,
    summary: 'Collapse overlapping time ranges into a clean schedule.', tags: ['sorting', 'ranges', 'greedy'], status: 'not-started',
    steps: sharedSteps('Intervals become easy after sorting by start. Compare each range to the end of the merged range; overlap means extend, a gap means commit and begin again.', 'The output is a frontier: the last interval is still editable until a gap proves it complete.',),
    prompt: 'Given an array of intervals, merge all overlapping intervals and return the non-overlapping ranges.', hints: ['Sort intervals by their start time.', 'Overlap exists when the next start is <= the current end.', 'Extend the current end with the larger end.'], starterCode: 'function merge(intervals) {\\n  // your code\\n}', solutionCode: 'function merge(intervals) {\\n  intervals.sort((a, b) => a[0] - b[0]);\\n  const merged = [];\\n  for (const [start, end] of intervals) {\\n    const last = merged[merged.length - 1];\\n    if (!last || start > last[1]) merged.push([start, end]);\\n    else last[1] = Math.max(last[1], end);\\n  }\\n  return merged;\\n}', complexity: { time: 'O(n log n)', space: 'O(n)' }, checkpoint: { question: 'Why sort by start time first?', choices: ['To compare only neighboring ranges', 'To make every overlap decision local', 'To avoid using an output array'], answer: 1 },
  },
  {
    slug: 'daily-temperatures', title: 'Daily Temperatures', number: 739, pattern: 'Stack', difficulty: 'Medium', estimatedMinutes: 17,
    summary: 'Find the next warmer day using a monotonic stack.', tags: ['arrays', 'monotonic stack'], status: 'not-started',
    steps: sharedSteps('A decreasing stack stores days still waiting for a warmer temperature. A new warmer day resolves every smaller temperature it can see from the top.', 'The stack holds unresolved indices, not values. Each index enters once and leaves once, giving a linear scan.',),
    prompt: 'Given daily temperatures, return how many days you must wait for a warmer temperature for each day.', hints: ['Keep indices whose answer is unknown.', 'Pop while today is warmer than the stack top.', 'The difference between indices is the wait.'], starterCode: 'function dailyTemperatures(temperatures) {\\n  // your code\\n}', solutionCode: 'function dailyTemperatures(temperatures) {\\n  const answer = Array(temperatures.length).fill(0);\\n  const stack = [];\\n  for (let i = 0; i < temperatures.length; i++) {\\n    while (stack.length && temperatures[i] > temperatures[stack.at(-1)]) {\\n      const j = stack.pop();\\n      answer[j] = i - j;\\n    }\\n    stack.push(i);\\n  }\\n  return answer;\\n}', complexity: { time: 'O(n)', space: 'O(n)' }, checkpoint: { question: 'What does the stack contain?', choices: ['All previous temperatures', 'Indices waiting for a warmer day', 'Only the current maximum'], answer: 1 },
  },
  {
    slug: 'add-two-numbers', title: 'Add Two Numbers', number: 2, pattern: 'Linked list', difficulty: 'Medium', estimatedMinutes: 20,
    summary: 'Add digits stored in reverse-order linked lists, carry included.', tags: ['linked list', 'math'], status: 'not-started',
    steps: sharedSteps('A dummy head gives a stable place to attach the result. Walk both lists together, treating missing nodes as zero and carrying overflow forward.', 'Each loop creates exactly one output digit. The carry is the small piece of state that connects adjacent columns.',),
    prompt: 'Two non-empty linked lists represent two non-negative integers in reverse order. Return their sum as a linked list.', hints: ['Use a dummy node to simplify the first insertion.', 'Continue while either list or carry has a value.', 'Digit is sum % 10; carry is floor(sum / 10).'], starterCode: 'function addTwoNumbers(l1, l2) {\\n  // your code\\n}', solutionCode: 'function addTwoNumbers(l1, l2) {\\n  const dummy = new ListNode(0);\\n  let tail = dummy, carry = 0;\\n  while (l1 || l2 || carry) {\\n    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;\\n    carry = Math.floor(sum / 10);\\n    tail.next = new ListNode(sum % 10);\\n    tail = tail.next; l1 = l1?.next; l2 = l2?.next;\\n  }\\n  return dummy.next;\\n}', complexity: { time: 'O(max(m, n))', space: 'O(max(m, n))' }, checkpoint: { question: 'What makes the dummy node useful?', choices: ['It stores the carry', 'It removes the special case for the head', 'It reverses the list'], answer: 1 },
  },
  {
    slug: 'binary-tree-level-order-traversal', title: 'Binary Tree Level Order Traversal', number: 102, pattern: 'Trees', difficulty: 'Medium', estimatedMinutes: 15,
    summary: 'Read a tree breadth-first, one level at a time.', tags: ['tree', 'BFS', 'queue'], status: 'not-started',
    steps: sharedSteps('Breadth-first search uses a queue. Capture the queue length before each level so children added during this pass belong to the next level.', 'The queue is a conveyor belt: remove every node currently on it, then append their children behind the new level boundary.',),
    prompt: 'Given the root of a binary tree, return the level order traversal of its node values.', hints: ['Return an empty array for no root.', 'Use queue length to isolate a level.', 'Append children after reading the current node.'], starterCode: 'function levelOrder(root) {\\n  // your code\\n}', solutionCode: 'function levelOrder(root) {\\n  if (!root) return [];\\n  const result = [], queue = [root];\\n  while (queue.length) {\\n    const level = [];\\n    for (let i = queue.length; i > 0; i--) {\\n      const node = queue.shift();\\n      level.push(node.val);\\n      if (node.left) queue.push(node.left);\\n      if (node.right) queue.push(node.right);\\n    }\\n    result.push(level);\\n  }\\n  return result;\\n}', complexity: { time: 'O(n)', space: 'O(n)' }, checkpoint: { question: 'How do we know where one level ends?', choices: ['Use a null marker only', 'Capture queue length before the loop', 'Compare node values'], answer: 1 },
  },
  {
    slug: 'number-of-islands', title: 'Number of Islands', number: 200, pattern: 'Graphs', difficulty: 'Medium', estimatedMinutes: 23,
    summary: 'Count connected land regions by exploring each cell once.', tags: ['matrix', 'DFS', 'connected components'], status: 'not-started',
    steps: sharedSteps('Every unvisited land cell starts a new component. Flood-fill its neighbors immediately so the same island is never counted again.', 'Think of the grid as a graph: each cell has up to four edges. Marking land as water is a simple visited set.',),
    prompt: 'Given a grid of 1s and 0s, count the number of islands connected horizontally or vertically.', hints: ['When you find land, increment the count.', 'DFS or BFS to mark the full island.', 'Mutate visited land to 0 or use a set.'], starterCode: 'function numIslands(grid) {\\n  // your code\\n}', solutionCode: 'function numIslands(grid) {\\n  let count = 0;\\n  const visit = (r, c) => {\\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === \"0\") return;\\n    grid[r][c] = \"0\";\\n    visit(r + 1, c); visit(r - 1, c);\\n    visit(r, c + 1); visit(r, c - 1);\\n  };\\n  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {\\n    if (grid[r][c] === \"1\") { count++; visit(r, c); }\\n  }\\n  return count;\\n}', complexity: { time: 'O(rows × cols)', space: 'O(rows × cols)' }, checkpoint: { question: 'When should the island count increase?', choices: ['For every land cell', 'When starting a flood-fill at unvisited land', 'After finishing the grid'], answer: 1 },
  },
  {
    slug: 'combination-sum', title: 'Combination Sum', number: 39, pattern: 'Backtracking', difficulty: 'Medium', estimatedMinutes: 25,
    summary: 'Explore candidate choices, undoing them when a path cannot work.', tags: ['recursion', 'search tree'], status: 'not-started',
    steps: sharedSteps('Backtracking is structured trial and error: choose, recurse, then undo. Keeping a start index prevents duplicate combinations in the same order.', 'Each node in the search tree is a partial combination. Stop branches when their sum exceeds the target.',),
    prompt: 'Given distinct candidates and a target, return all unique combinations where candidates sum to target. A number may be chosen unlimited times.', hints: ['Pass a start index to avoid permutations.', 'Subtract the chosen value from the remaining target.', 'Pop the choice after recursion returns.'], starterCode: 'function combinationSum(candidates, target) {\\n  // your code\\n}', solutionCode: 'function combinationSum(candidates, target) {\\n  const result = [], path = [];\\n  const dfs = (start, remain) => {\\n    if (remain === 0) return result.push([...path]);\\n    for (let i = start; i < candidates.length; i++) {\\n      if (candidates[i] > remain) continue;\\n      path.push(candidates[i]);\\n      dfs(i, remain - candidates[i]);\\n      path.pop();\\n    }\\n  };\\n  dfs(0, target); return result;\\n}', complexity: { time: 'O(n^(t/m))', space: 'O(t/m)' }, checkpoint: { question: 'What is the essential backtracking rhythm?', choices: ['Sort, slice, return', 'Choose, recurse, undo', 'Push until full, never remove'], answer: 1 },
  },
  {
    slug: 'kth-largest-element-in-an-array', title: 'Kth Largest Element in an Array', number: 215, pattern: 'Heap', difficulty: 'Medium', estimatedMinutes: 19,
    summary: 'Keep only the k largest values with a small min-heap.', tags: ['heap', 'selection', 'arrays'], status: 'not-started',
    steps: sharedSteps('A min-heap of size k keeps the current top k values. Its root is the smallest among the winners; anything smaller can be ignored.', 'The heap is a tiny leaderboard. Push a candidate, then remove the weakest when the board grows beyond k.',),
    prompt: 'Find the kth largest element in an unsorted array. The answer is the element in sorted order, not the kth distinct value.', hints: ['Maintain a min-heap with at most k entries.', 'If the heap grows beyond k, remove its minimum.', 'The root is kth largest at the end.'], starterCode: 'function findKthLargest(nums, k) {\\n  // your code\\n}', solutionCode: 'function findKthLargest(nums, k) {\\n  const heap = new MinHeap();\\n  for (const value of nums) {\\n    heap.push(value);\\n    if (heap.size() > k) heap.pop();\\n  }\\n  return heap.peek();\\n}', complexity: { time: 'O(n log k)', space: 'O(k)' }, checkpoint: { question: 'Why use a min-heap for kth largest?', choices: ['Its root is the weakest of the top k', 'It sorts all values for free', 'It always stores the smallest k'], answer: 0 },
  },
  {
    slug: 'coin-change', title: 'Coin Change', number: 322, pattern: 'Dynamic programming', difficulty: 'Medium', estimatedMinutes: 24,
    summary: 'Build the minimum coins for every smaller amount before the target.', tags: ['1D DP', 'optimization'], status: 'not-started',
    steps: sharedSteps('Define dp[amount] as the fewest coins needed for that amount. Every last coin creates a smaller subproblem, so reuse the best answers already built.', 'Fill a row of amounts left to right. For each coin, look back by its value and add one.',),
    prompt: 'Given coin denominations and an amount, return the fewest coins needed to make that amount, or -1 if impossible.', hints: ['Initialize every amount as amount + 1.', 'For each amount, try every coin.', 'dp[a] = min(dp[a], dp[a - coin] + 1).'], starterCode: 'function coinChange(coins, amount) {\\n  // your code\\n}', solutionCode: 'function coinChange(coins, amount) {\\n  const dp = Array(amount + 1).fill(amount + 1);\\n  dp[0] = 0;\\n  for (let a = 1; a <= amount; a++) {\\n    for (const coin of coins) {\\n      if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);\\n    }\\n  }\\n  return dp[amount] > amount ? -1 : dp[amount];\\n}', complexity: { time: 'O(amount × coins)', space: 'O(amount)' }, checkpoint: { question: 'What does dp[a] represent?', choices: ['The largest coin under a', 'Fewest coins needed to make amount a', 'Ways to make all amounts'], answer: 1 },
  },
  {
    slug: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence', number: 300, pattern: 'Dynamic programming', difficulty: 'Medium', estimatedMinutes: 21,
    summary: 'Track the strongest increasing subsequence ending at each position.', tags: ['1D DP', 'subsequence'], status: 'not-started',
    steps: sharedSteps('For each number, ask which earlier smaller number can precede it. The best sequence ending here is one longer than the best compatible predecessor.', 'Each dp cell is a small story: “the longest rising chain that ends exactly here.” The answer is the best story.',),
    prompt: 'Given an integer array, return the length of the longest strictly increasing subsequence.', hints: ['Initialize every dp value to 1.', 'Compare each number with earlier smaller numbers.', 'Take the maximum over all ending positions.'], starterCode: 'function lengthOfLIS(nums) {\\n  // your code\\n}', solutionCode: 'function lengthOfLIS(nums) {\\n  const dp = Array(nums.length).fill(1);\\n  for (let i = 0; i < nums.length; i++) {\\n    for (let j = 0; j < i; j++) {\\n      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);\\n    }\\n  }\\n  return Math.max(...dp);\\n}', complexity: { time: 'O(n²)', space: 'O(n)' }, checkpoint: { question: 'What is stored at dp[i]?', choices: ['Longest increasing sequence anywhere', 'Longest increasing sequence ending at i', 'The previous index'], answer: 1 },
  },
];

export const patterns = ['Sliding window', 'Two pointers', 'Binary search', 'Intervals', 'Stack', 'Linked list', 'Trees', 'Graphs', 'Backtracking', 'Heap', 'Dynamic programming'];