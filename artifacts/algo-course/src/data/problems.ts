import { neetcode150, patterns } from './neetcode150';

export type ProblemStatus = 'not-started' | 'in-progress' | 'completed';

export type LessonStep = {
  kind: 'concept' | 'visual' | 'checkpoint' | 'practice';
  title: string;
  subtitle: string;
  body?: string;
};

export type IntuitionCheck = {
  kind: 'invariant' | 'trace' | 'tradeoff';
  label: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

/** Everything the catalog knows about a problem, before a lesson is written for it. */
export type CatalogProblem = {
  slug: string;
  title: string;
  number: number;
  pattern: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  summary: string;
  tags: string[];
  prompt: string;
  starterCode: string;
  solutionCode: string;
  complexity: { time: string; space: string };
};

/** The hand-written teaching material layered on top of a catalog entry. */
export type Lesson = Partial<Omit<CatalogProblem, 'slug'>> & {
  slug: string;
  steps: LessonStep[];
  hints: string[];
  checkpoint: { question: string; choices: string[]; answer: number };
};

export type Problem = CatalogProblem & {
  status: ProblemStatus;
  /** True when a full guided lesson exists; false for catalog-only entries. */
  lessonReady: boolean;
  steps?: LessonStep[];
  hints?: string[];
  checkpoint?: { question: string; choices: string[]; answer: number };
};

const patternChecks: Record<string, [IntuitionCheck, IntuitionCheck]> = {
  'Sliding window': [
    { kind: 'trace', label: 'Trace a failure', question: 'When the window becomes invalid, what should move first?', choices: ['The right edge jumps back', 'The left edge moves until the invariant is restored', 'Both edges reset to the beginning'], answer: 1, explanation: 'Keep the scan moving forward. Shrinking only from the left preserves work already proved safe.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'Why does this beat checking every possible substring?', choices: ['It avoids revisiting characters that are still valid', 'It sorts the string before scanning', 'It tries every substring in parallel'], answer: 0, explanation: 'Each edge only moves forward, so the scan stays linear instead of restarting for every candidate range.' },
  ],
  'Two pointers': [
    { kind: 'trace', label: 'Trace a failure', question: 'For a sorted array, which side can be ruled out after a sum is too small?', choices: ['The larger value on the right', 'The smaller value on the left', 'Neither side can move'], answer: 1, explanation: 'Moving the smaller value is the only move that can increase the sum.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What work does the pointer walk avoid?', choices: ['Comparing every pair', 'Reading the input', 'Checking the final answer'], answer: 0, explanation: 'The sorted order lets each pointer movement eliminate many pairs at once.' },
  ],
  'Binary search': [
    { kind: 'trace', label: 'Trace a failure', question: 'What must be true before discarding half of the search space?', choices: ['The remaining predicate is monotonic', 'The array contains only unique values', 'The midpoint is the answer'], answer: 0, explanation: 'Binary search is safe when a yes/no condition changes direction at most once.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does binary search trade for its speed?', choices: ['It needs an ordered or monotonic signal', 'It uses more memory than a scan', 'It checks every item twice'], answer: 0, explanation: 'The logarithmic speed comes from relying on order; without a monotonic signal, the discard is not justified.' },
  ],
  Intervals: [
    { kind: 'trace', label: 'Trace a failure', question: 'After sorting intervals, when can the current interval merge with the previous one?', choices: ['When its start is before the current end', 'Only when both endpoints match', 'Whenever its end is larger'], answer: 0, explanation: 'Sorting makes the next interval the only one that can extend or break the current merged frontier.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'Why sort before scanning?', choices: ['It creates a one-direction timeline', 'It removes all duplicate intervals', 'It guarantees every interval overlaps'], answer: 0, explanation: 'The sort costs time up front, then makes the merge decision local and linear.' },
  ],
  Stack: [
    { kind: 'trace', label: 'Trace a failure', question: 'What belongs on the stack while a future answer is unresolved?', choices: ['Items waiting for a larger or smaller signal', 'Only items already solved', 'Every item from the input forever'], answer: 0, explanation: 'The stack stores unresolved work in an order that lets the next signal resolve the most recent candidate first.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does the stack save you from doing?', choices: ['Scanning backward repeatedly', 'Reading values in order', 'Storing the final result'], answer: 0, explanation: 'Each item is pushed and popped once, replacing repeated backward scans with amortized linear work.' },
  ],
  'Linked list': [
    { kind: 'trace', label: 'Trace a failure', question: 'What is the safest habit when rewiring a linked list?', choices: ['Save the next pointer before changing links', 'Change every pointer at once', 'Move only the head pointer'], answer: 0, explanation: 'Saving the next node prevents the remaining list from becoming unreachable.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'Why use pointer manipulation instead of copying values?', choices: ['The node relationships are the problem', 'Copies always use less memory', 'Pointers automatically sort the list'], answer: 0, explanation: 'The task usually asks you to change the list structure while preserving each node and its identity.' },
  ],
  Trees: [
    { kind: 'trace', label: 'Trace a failure', question: 'What does a level-order traversal need to remember?', choices: ['The next frontier of nodes', 'Only the deepest leaf', 'Every path as a string'], answer: 0, explanation: 'A queue preserves the current breadth frontier so each level can be processed before the next.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'When is breadth-first search a natural fit?', choices: ['When distance or level is the answer', 'When only one leaf matters', 'When the tree has no root'], answer: 0, explanation: 'BFS discovers nodes in increasing distance from the root, making level and shortest-depth questions direct.' },
  ],
  Graphs: [
    { kind: 'trace', label: 'Trace a failure', question: 'Why mark a node visited before exploring its neighbors?', choices: ['To prevent cycles from re-enqueueing it', 'To change its value', 'To sort adjacent nodes'], answer: 0, explanation: 'Marking on entry gives every node one owner and keeps cyclic graphs from causing repeated work.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does a graph traversal trade for complete coverage?', choices: ['Visited memory proportional to explored nodes', 'A second copy of every edge', 'Sorting all vertices first'], answer: 0, explanation: 'The visited set is the small amount of memory that buys safe, complete exploration.' },
  ],
  Backtracking: [
    { kind: 'trace', label: 'Trace a failure', question: 'What must happen after exploring one candidate choice?', choices: ['Undo the choice before trying the next', 'Keep every choice forever', 'Restart without returning'], answer: 0, explanation: 'Undoing restores the decision state so the next branch starts from the same clean prefix.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What makes backtracking manageable?', choices: ['Pruning choices that cannot lead to a valid answer', 'Sorting the final answers', 'Avoiding recursion entirely'], answer: 0, explanation: 'The search can be exponential, so every safe prune matters.' },
  ],
  Heap: [
    { kind: 'trace', label: 'Trace a failure', question: 'Why remove the root when a size-k heap grows too large?', choices: ['It is the weakest member of the kept candidates', 'It is always the global maximum', 'It is the newest item'], answer: 0, explanation: 'For a min-heap tracking the largest k values, the root is the easiest winner to discard.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'When is a heap preferable to sorting everything?', choices: ['When k is much smaller than n', 'When values are already strings', 'When every item must be output in order'], answer: 0, explanation: 'A size-k heap keeps memory and update cost tied to k instead of the entire input.' },
  ],
  'Arrays & hashing': [
    { kind: 'trace', label: 'Trace a failure', question: 'A hash map turns a nested scan into one pass. What does it actually hold?', choices: ['Everything seen so far, keyed for instant lookup', 'The final answer, updated in place', 'The input sorted by value'], answer: 0, explanation: 'The map is memory of the past, so the current element can ask a question about all previous ones at once.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What are you spending to drop from O(n²) to O(n)?', choices: ['Extra space proportional to the input', 'The ability to read the input in order', 'Accuracy on duplicate values'], answer: 0, explanation: 'Hashing trades memory for time; the map can grow as large as the input.' },
  ],
  Tries: [
    { kind: 'trace', label: 'Trace a failure', question: 'Why does a trie need an explicit end-of-word flag?', choices: ['Otherwise a prefix of a stored word looks like a stored word', 'Otherwise lookups never terminate', 'Otherwise the tree cannot be built'], answer: 0, explanation: 'Reaching a node only proves the prefix exists; the flag is what distinguishes "car" stored from "car" merely on the way to "cart".' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does a trie buy over a hash set of words?', choices: ['Prefix queries in the length of the prefix', 'Less memory in every case', 'Faster exact lookup than hashing'], answer: 0, explanation: 'A hash set answers "is this a word"; only the shared structure of a trie answers "is anything here starting with this".' },
  ],
  'Advanced graphs': [
    { kind: 'trace', label: 'Trace a failure', question: 'In Dijkstra, when is a node\u2019s distance final?', choices: ['When it is popped as the cheapest node on the frontier', 'When it is first discovered', 'Only after every edge has been relaxed'], answer: 0, explanation: 'With non-negative weights, nothing still on the frontier can offer a cheaper route, so the pop settles it.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'Why order the frontier by cost instead of using a plain queue?', choices: ['Weighted edges break BFS\u2019s equal-step assumption', 'A queue cannot store distances', 'It reduces the number of edges'], answer: 0, explanation: 'BFS is correct when every edge costs the same; once they differ, the cheapest-first order is what restores it.' },
  ],
  '2-D dynamic programming': [
    { kind: 'trace', label: 'Trace a failure', question: 'What does a cell in a two-input DP table mean?', choices: ['The answer for one prefix of each input', 'The answer for the whole problem so far', 'The number of moves made to reach it'], answer: 0, explanation: 'The two axes are the two inputs, so dp[i][j] answers the subproblem using i of one and j of the other.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'When can a 2-D table be collapsed to one row?', choices: ['When each cell depends only on the previous row', 'Whenever the inputs are strings', 'Only when the answer is a count'], answer: 0, explanation: 'Keeping just the rows a cell actually reads turns O(n·m) space into O(m).' },
  ],
  Greedy: [
    { kind: 'trace', label: 'Trace a failure', question: 'What makes a greedy choice safe rather than merely appealing?', choices: ['You can argue no better answer needs the choice you discarded', 'It looks best at the current step', 'It is the fastest to compute'], answer: 0, explanation: 'Greedy is only correct with an exchange argument: any optimal solution can be rewritten to include your choice without getting worse.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does greedy give up compared with dynamic programming?', choices: ['The ability to reconsider an earlier decision', 'The ability to read the whole input', 'Linear running time'], answer: 0, explanation: 'DP keeps every subproblem answer so it can revisit; greedy commits immediately, which is why the safety argument matters.' },
  ],
  'Math & geometry': [
    { kind: 'trace', label: 'Trace a failure', question: 'Rotating a matrix in place is usually built from which two steps?', choices: ['Transpose, then reverse each row', 'Reverse each row, then sort', 'Swap opposite corners only'], answer: 0, explanation: 'Reflecting across the diagonal and then horizontally composes into a quarter turn, and both steps are simple swaps.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'Why look for an index identity instead of simulating the motion?', choices: ['A closed form avoids extra buffers and edge cases', 'Simulation gives the wrong answer', 'Index maths is always faster to write'], answer: 0, explanation: 'These problems reward finding where an element must land, which usually removes the temporary copy entirely.' },
  ],
  'Bit manipulation': [
    { kind: 'trace', label: 'Trace a failure', question: 'What makes XOR useful for finding a lone value among pairs?', choices: ['A value XORed with itself is zero, and order does not matter', 'XOR sorts the values as it goes', 'XOR counts how often each value appears'], answer: 0, explanation: 'Being its own inverse and commutative means every pair cancels regardless of position, leaving only the unpaired value.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does a bitwise solution typically trade away?', choices: ['Readability, in exchange for constant space', 'Correctness on large inputs', 'The ability to handle negative numbers at all'], answer: 0, explanation: 'Bit tricks are compact and allocation-free, but they need a comment explaining the identity to stay maintainable.' },
  ],
  'Dynamic programming': [
    { kind: 'trace', label: 'Trace a failure', question: 'What makes a subproblem safe to reuse?', choices: ['Its answer depends on smaller, well-defined states', 'It changes randomly each time', 'It includes the entire input every time'], answer: 0, explanation: 'A clear state and recurrence turn repeated work into a table of answers.' },
    { kind: 'tradeoff', label: 'Choose the tradeoff', question: 'What does dynamic programming spend to avoid repeated recursion?', choices: ['Memory for stored subproblem answers', 'A second input array', 'Time sorting the states'], answer: 0, explanation: 'DP trades space for time by remembering the result of each state.' },
  ],
};

export function intuitionChecksFor(problem: Problem): IntuitionCheck[] {
  if (!problem.checkpoint) return [];
  const [trace, tradeoff] = patternChecks[problem.pattern] ?? [];
  return [
    {
      kind: 'invariant',
      label: 'Name the invariant',
      question: problem.checkpoint.question,
      choices: problem.checkpoint.choices,
      answer: problem.checkpoint.answer,
      explanation: 'The correct choice names the fact your algorithm keeps true while it moves through the input.',
    },
    trace,
    tradeoff,
  ].filter((check): check is IntuitionCheck => Boolean(check));
}

const sharedSteps = (concept: string, visual: string): LessonStep[] => [
  { kind: 'concept', title: 'Spot the pattern', subtitle: 'The idea before the syntax', body: concept },
  { kind: 'visual', title: 'Build a mental model', subtitle: 'Watch the invariant hold', body: visual },
  { kind: 'checkpoint', title: 'Quick checkpoint', subtitle: 'Make the next move yourself' },
  { kind: 'practice', title: 'Put it into code', subtitle: 'A clean implementation, then your turn' },
];

const lessons: Lesson[] = [
  {
    slug: 'longest-substring-without-repeating-characters', estimatedMinutes: 18,
    summary: 'Find the longest run of unique characters in one pass.', tags: ['strings', 'hash map', 'window'], steps: sharedSteps('A window is a range we keep valid while scanning. When a duplicate enters, move the left edge just past its previous position; there is no reason to revisit safe characters.', 'The right edge keeps moving. The left edge only moves forward, so every character is visited at most twice. The window is always duplicate-free.'),
    prompt: 'Given a string s, find the length of the longest substring without repeating characters.', hints: ['Track the last index where each character was seen.', 'When a repeated character is inside the window, jump left forward.', 'Update the best length after each right-edge move.'],
    starterCode: 'function lengthOfLongestSubstring(s) {\\n  // your code\\n}',
    solutionCode: 'function lengthOfLongestSubstring(s) {\\n  const lastSeen = new Map();\\n  let left = 0;\\n  let best = 0;\\n\\n  for (let right = 0; right < s.length; right++) {\\n    if (lastSeen.has(s[right])) {\\n      left = Math.max(left, lastSeen.get(s[right]) + 1);\\n    }\\n    lastSeen.set(s[right], right);\\n    best = Math.max(best, right - left + 1);\\n  }\\n  return best;\\n}',
    complexity: { time: 'O(n)', space: 'O(min(n, alphabet))' }, checkpoint: { question: 'What should the left edge do when a duplicate appears?', choices: ['Reset to index 0', 'Move just past the duplicate’s last index', 'Move one place right'], answer: 1 },
  },
  {
    slug: 'container-with-most-water', estimatedMinutes: 14,
    summary: 'Choose two lines that hold the most water without checking every pair.', tags: ['arrays', 'greedy', 'pointers'],
    steps: sharedSteps('The area is limited by the shorter wall. With two pointers at the ends, moving the taller wall cannot help: the shorter wall remains the bottleneck and the width shrinks.', 'Start wide, then discard the shorter side. The only chance to improve is to find a taller wall on that side; each pointer crosses the array once.'),
    prompt: 'Given n non-negative integers where each represents a vertical line, find two lines that form a container with the most water.', hints: ['Area = width × shorter height.', 'Move the pointer at the shorter line.', 'Keep the maximum area seen.'], starterCode: 'function maxArea(height) {\\n  // your code\\n}', solutionCode: 'function maxArea(height) {\\n  let left = 0, right = height.length - 1;\\n  let best = 0;\\n  while (left < right) {\\n    const width = right - left;\\n    best = Math.max(best, width * Math.min(height[left], height[right]));\\n    if (height[left] < height[right]) left++;\\n    else right--;\\n  }\\n  return best;\\n}', complexity: { time: 'O(n)', space: 'O(1)' }, checkpoint: { question: 'Which pointer can be safely moved?', choices: ['The taller pointer', 'The shorter pointer', 'Either, randomly'], answer: 1 },
  },
  {
    slug: 'search-in-rotated-sorted-array', estimatedMinutes: 22,
    summary: 'Use sorted halves to search an array that has been rotated.', tags: ['arrays', 'divide and conquer'],
    steps: sharedSteps('A rotated sorted array always has at least one sorted half. Compare the target to that half’s boundaries to decide whether to search it or the other half.', 'At every midpoint, one side is ordered. Keep the half where the target can still exist and discard the other half.',),
    prompt: 'Given a rotated sorted array of unique values and a target, return its index or -1 if it does not exist.', hints: ['Compare left, mid, and right to identify the sorted half.', 'Check whether target lies within sorted half bounds.', 'Shrink the search interval every iteration.'], starterCode: 'function search(nums, target) {\\n  // your code\\n}', solutionCode: 'function search(nums, target) {\\n  let left = 0, right = nums.length - 1;\\n  while (left <= right) {\\n    const mid = Math.floor((left + right) / 2);\\n    if (nums[mid] === target) return mid;\\n    if (nums[left] <= nums[mid]) {\\n      if (nums[left] <= target && target < nums[mid]) right = mid - 1;\\n      else left = mid + 1;\\n    } else if (nums[mid] < target && target <= nums[right]) left = mid + 1;\\n    else right = mid - 1;\\n  }\\n  return -1;\\n}', complexity: { time: 'O(log n)', space: 'O(1)' }, checkpoint: { question: 'What is guaranteed around any midpoint?', choices: ['Both halves are sorted', 'At least one half is sorted', 'The target is nearby'], answer: 1 },
  },
  {
    slug: 'merge-intervals', estimatedMinutes: 16,
    summary: 'Collapse overlapping time ranges into a clean schedule.', tags: ['sorting', 'ranges', 'greedy'],
    steps: sharedSteps('Intervals become easy after sorting by start. Compare each range to the end of the merged range; overlap means extend, a gap means commit and begin again.', 'The output is a frontier: the last interval is still editable until a gap proves it complete.',),
    prompt: 'Given an array of intervals, merge all overlapping intervals and return the non-overlapping ranges.', hints: ['Sort intervals by their start time.', 'Overlap exists when the next start is <= the current end.', 'Extend the current end with the larger end.'], starterCode: 'function merge(intervals) {\\n  // your code\\n}', solutionCode: 'function merge(intervals) {\\n  intervals.sort((a, b) => a[0] - b[0]);\\n  const merged = [];\\n  for (const [start, end] of intervals) {\\n    const last = merged[merged.length - 1];\\n    if (!last || start > last[1]) merged.push([start, end]);\\n    else last[1] = Math.max(last[1], end);\\n  }\\n  return merged;\\n}', complexity: { time: 'O(n log n)', space: 'O(n)' }, checkpoint: { question: 'Why sort by start time first?', choices: ['To compare only neighboring ranges', 'To make every overlap decision local', 'To avoid using an output array'], answer: 1 },
  },
  {
    slug: 'daily-temperatures', estimatedMinutes: 17,
    summary: 'Find the next warmer day using a monotonic stack.', tags: ['arrays', 'monotonic stack'],
    steps: sharedSteps('A decreasing stack stores days still waiting for a warmer temperature. A new warmer day resolves every smaller temperature it can see from the top.', 'The stack holds unresolved indices, not values. Each index enters once and leaves once, giving a linear scan.',),
    prompt: 'Given daily temperatures, return how many days you must wait for a warmer temperature for each day.', hints: ['Keep indices whose answer is unknown.', 'Pop while today is warmer than the stack top.', 'The difference between indices is the wait.'], starterCode: 'function dailyTemperatures(temperatures) {\\n  // your code\\n}', solutionCode: 'function dailyTemperatures(temperatures) {\\n  const answer = Array(temperatures.length).fill(0);\\n  const stack = [];\\n  for (let i = 0; i < temperatures.length; i++) {\\n    while (stack.length && temperatures[i] > temperatures[stack.at(-1)]) {\\n      const j = stack.pop();\\n      answer[j] = i - j;\\n    }\\n    stack.push(i);\\n  }\\n  return answer;\\n}', complexity: { time: 'O(n)', space: 'O(n)' }, checkpoint: { question: 'What does the stack contain?', choices: ['All previous temperatures', 'Indices waiting for a warmer day', 'Only the current maximum'], answer: 1 },
  },
  {
    slug: 'add-two-numbers', estimatedMinutes: 20,
    summary: 'Add digits stored in reverse-order linked lists, carry included.', tags: ['linked list', 'math'],
    steps: sharedSteps('A dummy head gives a stable place to attach the result. Walk both lists together, treating missing nodes as zero and carrying overflow forward.', 'Each loop creates exactly one output digit. The carry is the small piece of state that connects adjacent columns.',),
    prompt: 'Two non-empty linked lists represent two non-negative integers in reverse order. Return their sum as a linked list.', hints: ['Use a dummy node to simplify the first insertion.', 'Continue while either list or carry has a value.', 'Digit is sum % 10; carry is floor(sum / 10).'], starterCode: 'function addTwoNumbers(l1, l2) {\\n  // your code\\n}', solutionCode: 'function addTwoNumbers(l1, l2) {\\n  const dummy = { val: 0, next: null };\\n  let tail = dummy, carry = 0;\\n  while (l1 || l2 || carry) {\\n    const sum = (l1?.val ?? 0) + (l2?.val ?? 0) + carry;\\n    carry = Math.floor(sum / 10);\\n    tail.next = { val: sum % 10, next: null };\\n    tail = tail.next; l1 = l1?.next; l2 = l2?.next;\\n  }\\n  return dummy.next;\\n}', complexity: { time: 'O(max(m, n))', space: 'O(max(m, n))' }, checkpoint: { question: 'What makes the dummy node useful?', choices: ['It stores the carry', 'It removes the special case for the head', 'It reverses the list'], answer: 1 },
  },
  {
    slug: 'binary-tree-level-order-traversal', estimatedMinutes: 15,
    summary: 'Read a tree breadth-first, one level at a time.', tags: ['tree', 'BFS', 'queue'],
    steps: sharedSteps('Breadth-first search uses a queue. Capture the queue length before each level so children added during this pass belong to the next level.', 'The queue is a conveyor belt: remove every node currently on it, then append their children behind the new level boundary.',),
    prompt: 'Given the root of a binary tree, return the level order traversal of its node values.', hints: ['Return an empty array for no root.', 'Use queue length to isolate a level.', 'Append children after reading the current node.'], starterCode: 'function levelOrder(root) {\\n  // your code\\n}', solutionCode: 'function levelOrder(root) {\\n  if (!root) return [];\\n  const result = [];\\n  let frontier = [root];\\n\\n  while (frontier.length) {\\n    result.push(frontier.map((node) => node.val));\\n\\n    // Build the next level instead of shifting, which would be O(n) per node.\\n    const next = [];\\n    for (const node of frontier) {\\n      if (node.left) next.push(node.left);\\n      if (node.right) next.push(node.right);\\n    }\\n    frontier = next;\\n  }\\n  return result;\\n}', complexity: { time: 'O(n)', space: 'O(n)' }, checkpoint: { question: 'How do we know where one level ends?', choices: ['Use a null marker only', 'Capture queue length before the loop', 'Compare node values'], answer: 1 },
  },
  {
    slug: 'number-of-islands', estimatedMinutes: 23,
    summary: 'Count connected land regions by exploring each cell once.', tags: ['matrix', 'DFS', 'connected components'],
    steps: sharedSteps('Every unvisited land cell starts a new component. Flood-fill its neighbors immediately so the same island is never counted again.', 'Think of the grid as a graph: each cell has up to four edges. Marking land as water is a simple visited set.',),
    prompt: 'Given a grid of 1s and 0s, count the number of islands connected horizontally or vertically.', hints: ['When you find land, increment the count.', 'DFS or BFS to mark the full island.', 'Mutate visited land to 0 or use a set.'], starterCode: 'function numIslands(grid) {\\n  // your code\\n}', solutionCode: 'function numIslands(grid) {\\n  let count = 0;\\n  const visit = (r, c) => {\\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === \"0\") return;\\n    grid[r][c] = \"0\";\\n    visit(r + 1, c); visit(r - 1, c);\\n    visit(r, c + 1); visit(r, c - 1);\\n  };\\n  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {\\n    if (grid[r][c] === \"1\") { count++; visit(r, c); }\\n  }\\n  return count;\\n}', complexity: { time: 'O(rows × cols)', space: 'O(rows × cols)' }, checkpoint: { question: 'When should the island count increase?', choices: ['For every land cell', 'When starting a flood-fill at unvisited land', 'After finishing the grid'], answer: 1 },
  },
  {
    slug: 'combination-sum', estimatedMinutes: 25,
    summary: 'Explore candidate choices, undoing them when a path cannot work.', tags: ['recursion', 'search tree'],
    steps: sharedSteps('Backtracking is structured trial and error: choose, recurse, then undo. Keeping a start index prevents duplicate combinations in the same order.', 'Each node in the search tree is a partial combination. Stop branches when their sum exceeds the target.',),
    prompt: 'Given distinct candidates and a target, return all unique combinations where candidates sum to target. A number may be chosen unlimited times.', hints: ['Pass a start index to avoid permutations.', 'Subtract the chosen value from the remaining target.', 'Pop the choice after recursion returns.'], starterCode: 'function combinationSum(candidates, target) {\\n  // your code\\n}', solutionCode: 'function combinationSum(candidates, target) {\\n  const result = [], path = [];\\n  const dfs = (start, remain) => {\\n    if (remain === 0) return result.push([...path]);\\n    for (let i = start; i < candidates.length; i++) {\\n      if (candidates[i] > remain) continue;\\n      path.push(candidates[i]);\\n      dfs(i, remain - candidates[i]);\\n      path.pop();\\n    }\\n  };\\n  dfs(0, target); return result;\\n}', complexity: { time: 'O(n^(t/m))', space: 'O(t/m)' }, checkpoint: { question: 'What is the essential backtracking rhythm?', choices: ['Sort, slice, return', 'Choose, recurse, undo', 'Push until full, never remove'], answer: 1 },
  },
  {
    slug: 'kth-largest-element-in-an-array', estimatedMinutes: 19,
    summary: 'Keep only the k largest values with a small min-heap.', tags: ['heap', 'selection', 'arrays'],
    steps: sharedSteps('A min-heap of size k keeps the current top k values. Its root is the smallest among the winners; anything smaller can be ignored.', 'The heap is a tiny leaderboard. Push a candidate, then remove the weakest when the board grows beyond k.',),
    prompt: 'Find the kth largest element in an unsorted array. The answer is the element in sorted order, not the kth distinct value.', hints: ['Maintain a min-heap with at most k entries.', 'If the heap grows beyond k, remove its minimum.', 'The root is kth largest at the end.'], starterCode: 'function findKthLargest(nums, k) {\\n  // your code\\n}', solutionCode: '// JavaScript has no built-in heap, so here is a small one.\n// Comparator: (a, b) => a - b for a min-heap.\nclass Heap {\n  constructor(compare) { this.compare = compare; this.items = []; }\n  size() { return this.items.length; }\n  peek() { return this.items[0]; }\n  push(value) {\n    this.items.push(value);\n    let i = this.items.length - 1;\n    while (i > 0) {\n      const parent = (i - 1) >> 1;\n      if (this.compare(this.items[i], this.items[parent]) >= 0) break;\n      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];\n      i = parent;\n    }\n  }\n  pop() {\n    const top = this.items[0];\n    const last = this.items.pop();\n    if (this.items.length) {\n      this.items[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = i * 2 + 1, r = l + 1;\n        let best = i;\n        if (l < this.items.length && this.compare(this.items[l], this.items[best]) < 0) best = l;\n        if (r < this.items.length && this.compare(this.items[r], this.items[best]) < 0) best = r;\n        if (best === i) break;\n        [this.items[i], this.items[best]] = [this.items[best], this.items[i]];\n        i = best;\n      }\n    }\n    return top;\n  }\n}\n\nfunction findKthLargest(nums, k) {\\n  const heap = new Heap((a, b) => a - b);\\n  for (const value of nums) {\\n    heap.push(value);\\n    if (heap.size() > k) heap.pop();\\n  }\\n  return heap.peek();\\n}', complexity: { time: 'O(n log k)', space: 'O(k)' }, checkpoint: { question: 'Why use a min-heap for kth largest?', choices: ['Its root is the weakest of the top k', 'It sorts all values for free', 'It always stores the smallest k'], answer: 0 },
  },
  {
    slug: 'coin-change', estimatedMinutes: 24,
    summary: 'Build the minimum coins for every smaller amount before the target.', tags: ['1D DP', 'optimization'],
    steps: sharedSteps('Define dp[amount] as the fewest coins needed for that amount. Every last coin creates a smaller subproblem, so reuse the best answers already built.', 'Fill a row of amounts left to right. For each coin, look back by its value and add one.',),
    prompt: 'Given coin denominations and an amount, return the fewest coins needed to make that amount, or -1 if impossible.', hints: ['Initialize every amount as amount + 1.', 'For each amount, try every coin.', 'dp[a] = min(dp[a], dp[a - coin] + 1).'], starterCode: 'function coinChange(coins, amount) {\\n  // your code\\n}', solutionCode: 'function coinChange(coins, amount) {\\n  const dp = Array(amount + 1).fill(amount + 1);\\n  dp[0] = 0;\\n  for (let a = 1; a <= amount; a++) {\\n    for (const coin of coins) {\\n      if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);\\n    }\\n  }\\n  return dp[amount] > amount ? -1 : dp[amount];\\n}', complexity: { time: 'O(amount × coins)', space: 'O(amount)' }, checkpoint: { question: 'What does dp[a] represent?', choices: ['The largest coin under a', 'Fewest coins needed to make amount a', 'Ways to make all amounts'], answer: 1 },
  },
  {
    slug: 'longest-increasing-subsequence', estimatedMinutes: 21,
    summary: 'Track the strongest increasing subsequence ending at each position.', tags: ['1D DP', 'subsequence'],
    steps: sharedSteps('For each number, ask which earlier smaller number can precede it. The best sequence ending here is one longer than the best compatible predecessor.', 'Each dp cell is a small story: “the longest rising chain that ends exactly here.” The answer is the best story.',),
    prompt: 'Given an integer array, return the length of the longest strictly increasing subsequence.', hints: ['Initialize every dp value to 1.', 'Compare each number with earlier smaller numbers.', 'Take the maximum over all ending positions.'], starterCode: 'function lengthOfLIS(nums) {\\n  // your code\\n}', solutionCode: 'function lengthOfLIS(nums) {\\n  const dp = Array(nums.length).fill(1);\\n  for (let i = 0; i < nums.length; i++) {\\n    for (let j = 0; j < i; j++) {\\n      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);\\n    }\\n  }\\n  return Math.max(...dp);\\n}', complexity: { time: 'O(n²)', space: 'O(n)' }, checkpoint: { question: 'What is stored at dp[i]?', choices: ['Longest increasing sequence anywhere', 'Longest increasing sequence ending at i', 'The previous index'], answer: 1 },
  },
  {
    slug: 'two-sum',
    steps: sharedSteps('A nested loop asks each pair the same question twice. Instead, as you walk the array once, remember every value you have already passed along with its index. At each new number you only have to ask one thing: have I already seen the complement that completes the target?', 'Picture two columns: the array you are walking, and a map of everything behind you. The map only ever grows, and the lookup in it is constant, so the whole scan stays linear.'),
    hints: ['Store value to index, not index to value \\u2014 you look up by the number you need.', 'The complement of nums[i] is target - nums[i].', 'Check the map before inserting, or a value could match itself.'],
    checkpoint: { question: 'Why check the map before inserting the current number?', choices: ['To keep the map smaller', 'So an element cannot be paired with itself', 'Because insertion is slower than lookup'], answer: 1 },
  },
  {
    slug: 'product-of-array-except-self',
    steps: sharedSteps('Every answer is the product of everything to the left times everything to the right. Those two families of products are each buildable in a single sweep, so two passes replace the division you are not allowed to use.', 'Sweep left to right carrying a running prefix and write it into the output. Then sweep right to left carrying a running suffix and multiply it in. The output array doubles as the workspace, so no extra space is needed.'),
    hints: ['Fill the output with prefix products first, before you know any suffix.', 'Carry the suffix in a single variable on the way back.', 'A zero in the input is handled automatically \\u2014 you never divide.'],
    checkpoint: { question: 'Why does this avoid a special case for zeros?', choices: ['Zeros are filtered out first', 'No division ever happens, so a zero is just another factor', 'The prefix pass skips them'], answer: 1 },
  },
  {
    slug: '3sum',
    steps: sharedSteps('Fix one number and the problem collapses into a two-sum over the rest. Sorting first is what makes that inner search a two-pointer walk instead of another loop, and it also puts duplicates next to each other so they are easy to skip.', 'The anchor moves left to right. For each anchor, two pointers close in from both ends of the remaining range: too small moves the left pointer up, too large moves the right one down.'),
    hints: ['Sort first; everything else depends on the order.', 'Skip an anchor equal to the previous one, or you will emit the same triplet twice.', 'After recording a hit, advance past any duplicate values as well.'],
    checkpoint: { question: 'After recording a valid triplet, why keep moving the left pointer past equal values?', choices: ['To reach the end faster', 'To avoid emitting the same triplet again', 'Because the sum can no longer be zero'], answer: 1 },
  },
  {
    slug: 'longest-repeating-character-replacement',
    steps: sharedSteps('A window is legal when the characters you would have to change fit inside your budget. That count is the window length minus the count of its most common letter, so you never need to know which letters are wrong \\u2014 only how many.', 'The right edge always advances. When the window becomes illegal, the left edge advances until it is legal again. Both edges only move forward, so the scan is linear even though the window grows and shrinks.'),
    hints: ['Track a count per character inside the window.', 'The cost of a window is its length minus its highest single count.', 'Shrink from the left only while that cost exceeds k.'],
    checkpoint: { question: 'What makes a window legal here?', choices: ['Every character appears at most k times', 'Length minus the most frequent count is at most k', 'It contains at most k distinct characters'], answer: 1 },
  },
  {
    slug: 'valid-parentheses',
    steps: sharedSteps('Closing brackets have to match the most recently opened one, and \\u201cmost recent first\\u201d is exactly what a stack gives you. Push every opener, and let every closer pop the partner it expects.', 'The stack is the list of promises you still owe. A closer either cancels the promise on top or proves the string invalid. Finishing with an empty stack means every promise was kept.'),
    hints: ['Push openers; on a closer, compare against what you pop.', 'A closer arriving at an empty stack is an immediate failure.', 'Leftover openers at the end mean the string is unbalanced too.'],
    checkpoint: { question: 'Why is a stack the right structure rather than a counter?', choices: ['It is faster than counting', 'Counting cannot tell which bracket type must close', 'A stack uses less memory'], answer: 1 },
  },
  {
    slug: 'koko-eating-bananas',
    steps: sharedSteps('You cannot search the piles, but you can search the answer. Any speed fast enough stays fast enough, and any speed too slow stays too slow \\u2014 that single flip from \\u201cno\\u201d to \\u201cyes\\u201d is all binary search needs.', 'Lay the candidate speeds from 1 to the largest pile in a row and mark each as feasible or not. The row is all \\u201cno\\u201d then all \\u201cyes\\u201d, so halving it finds the boundary in logarithmic steps, each costing one pass over the piles.'),
    hints: ['The search space is speeds, not array indices.', 'Hours at speed k is the sum of ceil(pile / k).', 'When a speed is feasible, keep it as a candidate and search lower.'],
    checkpoint: { question: 'What property of the feasibility test makes binary search valid here?', choices: ['It is cheap to evaluate', 'It flips from false to true exactly once as speed increases', 'It returns an exact hour count'], answer: 1 },
  },
  {
    slug: 'reverse-linked-list',
    steps: sharedSteps('Reversing is three pointers moving in step. Before you flip a node\\u2019s next pointer you must already hold the node that comes after it, or the remainder of the list becomes unreachable.', 'Think of prev, curr and next as a small carriage sliding along the list. Each step saves next, points curr back at prev, then shifts all three forward by one. When curr runs off the end, prev is the new head.'),
    hints: ['Save curr.next before overwriting it.', 'prev starts as null \\u2014 it becomes the new tail\\u2019s next.', 'Return prev, not curr; curr is null when the loop ends.'],
    checkpoint: { question: 'Why save the next pointer before reversing a link?', choices: ['To compare values later', 'Otherwise the rest of the list is unreachable', 'To keep the list sorted'], answer: 1 },
  },
  {
    slug: 'validate-binary-search-tree',
    steps: sharedSteps('Checking each node against only its parent is not enough: a value can satisfy its parent and still violate an ancestor. Every node actually inherits an open range from the whole path above it, and that range tightens as you descend.', 'Carry a low and high bound down the tree. Going left replaces the high bound with the current value; going right replaces the low bound. A node is valid only if it sits strictly inside the range it was handed.'),
    hints: ['Pass bounds down rather than comparing with the parent alone.', 'Left subtree gets (low, node.val); right gets (node.val, high).', 'Start with infinities so the root is unconstrained.'],
    checkpoint: { question: 'Why is comparing each node only with its parent insufficient?', choices: ['It misses duplicate values', 'A node can satisfy its parent yet violate a higher ancestor', 'It visits nodes in the wrong order'], answer: 1 },
  },
  {
    slug: 'find-median-from-data-stream',
    steps: sharedSteps('The median only depends on the middle, so you never need the stream sorted \\u2014 only split. Keep the smaller half under a max-heap and the larger half under a min-heap, and the two roots are exactly the values the median is made from.', 'Two heaps face each other across the middle. Every insert pushes into one side and moves its extreme across to the other, then rebalances so the sizes differ by at most one. The answer is then one root, or the average of both.'),
    hints: ['Push into the low half first, then move its maximum into the high half.', 'Rebalance whenever the high half grows larger than the low half.', 'An odd total means the larger heap\\u2019s root is the answer outright.'],
    checkpoint: { question: 'Why push into one heap and immediately move its extreme to the other?', choices: ['To keep the heaps the same size', 'To guarantee every low value stays below every high value', 'To avoid duplicate values'], answer: 1 },
  },
  {
    slug: 'subsets',
    steps: sharedSteps('Every element faces one independent decision: in or out. Laying those decisions end to end builds a binary tree of depth n whose leaves are exactly the 2^n subsets, with no duplicates to worry about because the elements are distinct.', 'At index i the search splits in two: take nums[i] and recurse, then undo that choice and recurse again. The path you are carrying is the subset under construction; a leaf is reached once every element has been decided.'),
    hints: ['Recurse on index, not on the remaining array.', 'Push a copy of the path at a leaf \\u2014 the path keeps changing.', 'Undo the choice after the first branch returns.'],
    checkpoint: { question: 'Why push a copy of the path rather than the path itself?', choices: ['Copies are faster', 'The path is mutated further as the search continues', 'It keeps the results sorted'], answer: 1 },
  },
  {
    slug: 'implement-trie-prefix-tree',
    steps: sharedSteps('A trie stores words by their shared prefixes: each node is one character, and a path from the root spells a string. Lookup then costs the length of the word rather than the size of the dictionary, and asking about a prefix costs no more than reaching it.', 'Picture the words fanning out from a single root, splitting only where they stop agreeing. A flag on a node marks \\u201ca word ends here\\u201d, which is what separates a stored word from a prefix that merely happens to pass through.'),
    hints: ['Give each node a map from character to child node.', 'Insert walks the word, creating any missing child as it goes.', 'search and startsWith share the same walk; only the final check differs.'],
    checkpoint: { question: 'Why does a node need an end-of-word flag?', choices: ['To free memory when words are removed', 'Otherwise a prefix of a stored word looks stored too', 'To keep the children sorted'], answer: 1 },
  },
  {
    slug: 'course-schedule',
    steps: sharedSteps('Prerequisites form a directed graph, and you can finish everything exactly when that graph has no cycle. Rather than hunting for cycles directly, repeatedly take any course with nothing left blocking it; if you run out of such courses early, what remains is a cycle.', 'Count how many prerequisites each course still has. Courses at zero form the frontier. Taking one lowers the count of everything it unlocks, which may push more courses to zero. Count what you managed to take.'),
    hints: ['Build edges from prerequisite to dependent course.', 'Track an in-degree per course and start with the zeros.', 'If the number taken is less than numCourses, a cycle blocked you.'],
    checkpoint: { question: 'What does it mean if the queue empties before every course is taken?', choices: ['The graph is disconnected', 'The remaining courses form a cycle', 'Some course has no prerequisites'], answer: 1 },
  },
  {
    slug: 'network-delay-time',
    steps: sharedSteps('The signal reaches every node along its cheapest path, so this is single-source shortest path with non-negative weights. Always expanding the cheapest node still on the frontier means the first time you settle a node, you have found its best route.', 'The frontier is a heap ordered by total time. Popping the cheapest node fixes its distance forever, because anything still waiting already costs at least as much. The answer is the largest settled distance, or -1 if some node never settled.'),
    hints: ['Order the frontier by accumulated time, not by hop count.', 'Skip a node you have already settled.', 'If fewer than n nodes settle, something was unreachable.'],
    checkpoint: { question: 'Why is a node\\u2019s distance final the moment it is popped?', choices: ['Every node is visited exactly once', 'Nothing remaining on the frontier can be cheaper, given non-negative weights', 'The heap sorts the whole graph in advance'], answer: 1 },
  },
  {
    slug: 'unique-paths',
    steps: sharedSteps('A cell can only be entered from above or from the left, so the number of ways to reach it is the sum of the ways to reach those two neighbours. The top row and left column have exactly one path each, which seeds the whole grid.', 'Fill the grid row by row, left to right. Because a cell only ever reads the row above and the cell beside it, one row of numbers is enough \\u2014 each value is updated in place as the sweep passes.'),
    hints: ['Initialise the first row to all ones.', 'Each cell becomes itself plus the value to its left.', 'The value already in the slot is the row above, before you overwrite it.'],
    checkpoint: { question: 'When the row is reused in place, what does the existing value represent?', choices: ['The cell to the left', 'The cell directly above', 'The previous column total'], answer: 1 },
  },
  {
    slug: 'longest-common-subsequence',
    steps: sharedSteps('Compare the two strings one character at a time. If the characters match, the best answer extends the answer for both shorter prefixes. If they do not, you must drop a character from one string or the other, and you take whichever loss is smaller.', 'The table has one string along each axis, so a cell answers \\u201cthe best using i of the first and j of the second\\u201d. A match reads the diagonal; a mismatch reads up or left. Only the previous row is ever needed.'),
    hints: ['A match adds one to the diagonal neighbour.', 'A mismatch takes the larger of the cell above and the cell to the left.', 'Row zero and column zero are all zeros \\u2014 an empty string shares nothing.'],
    checkpoint: { question: 'Why does a match read the diagonal cell rather than the one above?', choices: ['The diagonal is always larger', 'Both strings advance, so both prefixes shrink by one', 'It avoids counting the character twice'], answer: 1 },
  },
  {
    slug: 'maximum-subarray',
    steps: sharedSteps('Walk the array carrying the best sum ending exactly here. Extending the previous run only helps while that run is positive; the moment it turns negative it is a burden, and starting fresh at the current element is better.', 'One number slides along the array: the running best ending at this position. It either grows by the current value or resets to it. A second number remembers the largest it has ever been.'),
    hints: ['Compare the running sum plus the element against the element alone.', 'Reset whenever carrying the prefix would make things worse.', 'Track the overall maximum separately from the running one.'],
    checkpoint: { question: 'When should the running sum restart at the current element?', choices: ['When the element is negative', 'When the previous running sum is negative', 'When the sum exceeds the current best'], answer: 1 },
  },
  {
    slug: 'non-overlapping-intervals',
    steps: sharedSteps('Removing the fewest intervals is the same as keeping the most. Sorting by end time makes the greedy choice safe: the interval that finishes earliest leaves the most room for everything after it, so keeping it can never be worse.', 'Lay the intervals on a timeline ordered by their right edge. Sweep once, keeping an interval whenever it starts at or after the last one you kept. Everything you skip is an interval you would have had to remove.'),
    hints: ['Sort by end time, not by start time.', 'Keep an interval when its start is at least the last kept end.', 'The answer is the total count minus the number kept.'],
    checkpoint: { question: 'Why sort by end time rather than start time?', choices: ['It groups overlapping intervals together', 'Finishing earliest leaves the most room for the rest', 'It makes the sort faster'], answer: 1 },
  },
  {
    slug: 'rotate-image',
    steps: sharedSteps('A quarter turn is two reflections. Flip the matrix across its main diagonal, then mirror each row left to right, and every element lands exactly where a clockwise rotation would put it \\u2014 all with swaps, so no second matrix is needed.', 'First picture the grid folding along the diagonal: cell (r, c) trades places with (c, r). Then each row reverses. Doing both in sequence is the rotation; doing either alone is not.'),
    hints: ['Transpose by swapping only above the diagonal, or you undo your own work.', 'Reverse each row after the transpose, not before.', 'Every step is a swap, so no temporary grid is required.'],
    checkpoint: { question: 'Why does the transpose loop start at c = r + 1?', choices: ['To skip empty cells', 'Swapping the whole grid would undo every swap', 'To keep the diagonal sorted'], answer: 1 },
  },
  {
    slug: 'single-number',
    steps: sharedSteps('XOR is its own inverse and does not care about order, so any value combined with itself vanishes. Fold the whole array together with XOR and every pair annihilates, leaving only the element that had no partner.', 'Imagine the numbers cancelling in pairs no matter how they are scattered through the array. The accumulator passes through them all in one sweep and holds the survivor at the end.'),
    hints: ['Start the accumulator at 0, which is XOR\\u2019s identity.', 'XOR each element into it in a single pass.', 'No map or sort is needed, so the space stays constant.'],
    checkpoint: { question: 'Which property lets the pairs cancel regardless of their positions?', choices: ['XOR is commutative and self-inverse', 'XOR sorts the values', 'XOR counts occurrences'], answer: 0 },
  },
  {
    slug: 'contains-duplicate',
    steps: sharedSteps('The question is only whether a value has been seen before, so you never need counts or positions. A set answers exactly that in constant time, which turns a comparison of every pair into a single walk.', 'One pass, one growing set. Each element asks the set a yes/no question and then joins it. The first yes ends the scan immediately.'),
    hints: ['A set stores membership, which is all this question needs.', 'Check before inserting, not after.', 'Returning early on the first repeat avoids scanning the rest.'],
    checkpoint: { question: 'Why is a set enough here rather than a map of counts?', choices: ['Sets are faster than maps', 'The question is membership, not frequency', 'Sets keep the values sorted'], answer: 1 },
  },
  {
    slug: 'valid-anagram',
    steps: sharedSteps('Anagrams are equal as multisets: the same letters with the same counts, in any order. Counting each letter once in each string reduces the comparison to checking those two tallies agree.', 'Build a tally from the first string, then spend it with the second. If a letter runs out or a surplus remains at the end, the strings differ.'),
    hints: ['Unequal lengths can be rejected immediately.', 'Count up for one string and down for the other.', 'A count dropping below zero means a mismatch.'],
    checkpoint: { question: 'Why can unequal lengths be rejected before counting?', choices: ['Counting is expensive', 'Anagrams must use exactly the same letters, so the totals match', 'Shorter strings are never anagrams'], answer: 1 },
  },
  {
    slug: 'group-anagrams',
    steps: sharedSteps('Two words belong together when their letter counts match, so give every word a canonical key built from those counts. Words that are anagrams then collide in the map on purpose.', 'Each word is reduced to a signature and dropped into the bucket that signature names. The buckets are the answer; their order never mattered.'),
    hints: ['A 26-slot count array joined into a string makes a stable key.', 'Sorting the letters also works, at a log factor per word.', 'Build the groups as you scan; no second pass is needed.'],
    checkpoint: { question: 'What makes a good grouping key here?', choices: ['Anything identical for anagrams and different otherwise', 'The first letter of each word', 'The length of the word'], answer: 0 },
  },
  {
    slug: 'top-k-frequent-elements',
    steps: sharedSteps('A frequency can never exceed the length of the array, so frequencies make a usable index. Placing each value into a bucket numbered by its count lets you read the answer off the top without sorting anything.', 'Count first, then lay out buckets from 0 to n. Walk the buckets downward and collect values until you have k. Every step is linear.'),
    hints: ['Build the counts with a map first.', 'Bucket index is the count; each bucket holds the values with that count.', 'Walk from the highest bucket down and stop at k.'],
    checkpoint: { question: 'Why can bucket sort replace a comparison sort here?', choices: ['The values are already sorted', 'Counts are bounded by the array length, so they index directly', 'k is always small'], answer: 1 },
  },
  {
    slug: 'encode-and-decode-strings',
    steps: sharedSteps('Any delimiter you pick could appear inside the data, so do not rely on one. Prefixing each string with its own length tells the decoder exactly how far to read, whatever the contents.', 'The encoded stream alternates between a length, a marker, and exactly that many characters. The decoder never has to guess where a string ends.'),
    hints: ['Write length, then a separator, then the raw string.', 'The decoder reads digits until the separator, then slices that many characters.', 'The separator is safe because it is only read while parsing the length.'],
    checkpoint: { question: 'Why is a length prefix safer than a delimiter alone?', choices: ['It compresses the output', 'The payload can contain any character without ambiguity', 'It makes decoding faster'], answer: 1 },
  },
  {
    slug: 'valid-sudoku',
    steps: sharedSteps('The three rules are the same rule applied to three different groupings. Track one set per row, one per column and one per box, and every cell simply reports into the three groups it belongs to.', 'A single sweep over all 81 cells. Each filled cell checks its three sets and joins them. The box index is derived from the row and column, not tracked separately.'),
    hints: ['Keep 9 row sets, 9 column sets and 9 box sets.', 'Box index is (row / 3) * 3 + (column / 3), integer divided.', 'Only filled cells matter; skip the blanks.'],
    checkpoint: { question: 'How is the box index derived from a cell position?', choices: ['From the row alone', 'By integer-dividing both row and column by three', 'It must be tracked with a counter'], answer: 1 },
  },
  {
    slug: 'longest-consecutive-sequence',
    steps: sharedSteps('Sorting would answer this in n log n, but the run can be found in linear time by only starting a count where a run actually begins. A number begins a run exactly when the number below it is absent.', 'Put everything in a set. Most numbers are skipped immediately because they have a left neighbour. The few that start a run walk upward, and across the whole array each number is walked at most once.'),
    hints: ['Put every value in a set first.', 'Skip n whenever n - 1 is present.', 'From a starting number, count upward while the successor exists.'],
    checkpoint: { question: 'Why does skipping numbers that have a left neighbour keep this linear?', choices: ['It removes duplicates', 'Each run is walked from its start exactly once', 'It sorts the set implicitly'], answer: 1 },
  },
  {
    slug: 'valid-palindrome',
    steps: sharedSteps('Only alphanumeric characters count, and case does not matter. Rather than building a cleaned copy, walk inward from both ends and step over anything that should be ignored.', 'Two pointers move toward each other. Each skips junk on its own side, then the pair is compared. They meet in the middle having touched each character once.'),
    hints: ['Skip non-alphanumeric characters before comparing.', 'Lowercase both sides at the moment of comparison.', 'Stop as soon as the pointers cross.'],
    checkpoint: { question: 'Why walk in place instead of building a filtered string first?', choices: ['It avoids an extra pass and extra space', 'Filtering would change the answer', 'Strings cannot be filtered in JavaScript'], answer: 0 },
  },
  {
    slug: 'two-sum-ii-input-array-is-sorted',
    steps: sharedSteps('Because the array is sorted, the current sum tells you which way to move. Too small means the only way up is a larger left value; too large means the only way down is a smaller right value.', 'Two pointers start at the ends. Every comparison eliminates an entire row or column of the pair grid, so the walk is linear and needs no extra memory.'),
    hints: ['Start wide: one pointer at each end.', 'A sum below target moves the left pointer right.', 'The answer is 1-indexed, so add one to each index.'],
    checkpoint: { question: 'When the sum is too small, why is moving the left pointer the only useful move?', choices: ['It is closer to the start', 'Moving right would shrink the sum further', 'The right pointer cannot move'], answer: 1 },
  },
  {
    slug: 'trapping-rain-water',
    steps: sharedSteps('Water above a cell is decided by the tallest wall to its left and to its right: it fills to the smaller of those two, minus the ground. You never need both maxima exactly, only the one you can already be sure about.', 'Two pointers with a running max on each side. Whichever side has the smaller running max is the side whose answer is already determined, so that side advances and banks its water.'),
    hints: ['Water at a cell is min(leftMax, rightMax) minus its own height.', 'Advance the pointer on the smaller side.', 'That side is safe because the other max can only grow.'],
    checkpoint: { question: 'Why is it safe to settle the side with the smaller running max?', choices: ['That side has less water', 'Its limit is already fixed, since the other side can only get taller', 'It reaches the end sooner'], answer: 1 },
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    steps: sharedSteps('You must buy before you sell, so as you walk forward the only thing worth remembering is the cheapest price so far. Every day is a candidate sale against that minimum.', 'One pass carrying two numbers: the lowest price yet seen, and the best profit yet achieved. Each new price updates one or the other, never both in a way that needs a second look.'),
    hints: ['Track the minimum price seen so far.', 'Profit today is price minus that minimum.', 'Update the minimum after taking the profit, or before; both work if done consistently.'],
    checkpoint: { question: 'Why is one pass enough for a buy-then-sell ordering?', choices: ['The prices are sorted', 'The minimum so far is always a legal purchase date', 'Profit is symmetric'], answer: 1 },
  },
  {
    slug: 'permutation-in-string',
    steps: sharedSteps('A permutation has a fixed length and a fixed letter count, so the window never changes size. Slide a window the width of the first string and ask whether its counts match.', 'The window advances one character at a time: one letter joins on the right, one leaves on the left. Only two counts change per step, so each comparison stays cheap.'),
    hints: ['The window is exactly s1.length wide.', 'Add the entering character and remove the leaving one.', 'Compare fixed-size count arrays, not sorted strings.'],
    checkpoint: { question: 'Why does the window here stay a fixed width?', choices: ['The string is short', 'A permutation has exactly the same length', 'Fixed windows are faster to compare'], answer: 1 },
  },
  {
    slug: 'minimum-window-substring',
    steps: sharedSteps('Grow the window until it is valid, then shrink it from the left while it stays valid. The smallest window ending at each right edge is found by that shrink, so tracking the best across all right edges gives the answer.', 'The right edge only moves forward, admitting characters. Whenever the requirement is met, the left edge advances as far as it can. Both edges cross the string once.'),
    hints: ['Count what is needed, then count down as characters arrive.', 'Track how many distinct requirements are still unmet.', 'Only record the best window while the requirement is satisfied.'],
    checkpoint: { question: 'Why shrink from the left as soon as the window becomes valid?', choices: ['To find the smallest window ending at this right edge', 'To reset the counts', 'Because the left edge may move backwards later'], answer: 0 },
  },
  {
    slug: 'sliding-window-maximum',
    steps: sharedSteps('A value can never be the maximum again once a larger value appears to its right. Keeping only the indices whose values are strictly decreasing therefore keeps exactly the candidates that still matter, with the front always being the answer.', 'A deque of indices. A new value pops every smaller value off the back, then joins. The front is dropped when it falls outside the window. Each index enters and leaves once.'),
    hints: ['Store indices, not values, so the window boundary is checkable.', 'Pop from the back while the incoming value is larger.', 'Drop the front once it is outside the window.'],
    checkpoint: { question: 'Why can a smaller value be discarded when a larger one arrives after it?', choices: ['It saves memory', 'It can never be the maximum of any later window', 'The deque must stay sorted'], answer: 1 },
  },
  {
    slug: 'min-stack',
    steps: sharedSteps('Scanning for the minimum on demand would be linear, so the minimum has to be maintained as the stack changes. Storing the minimum-so-far alongside each value means every pop restores the previous minimum for free.', 'Two stacks rising together: the values, and the best value at or below each level. Popping both together keeps them in step, so getMin is just a peek.'),
    hints: ['Push the smaller of the new value and the current minimum.', 'Pop both stacks together.', 'getMin never searches; it reads the top.'],
    checkpoint: { question: 'Why store a minimum per level rather than a single variable?', choices: ['A single variable cannot be restored after a pop', 'It uses less memory', 'Stacks require parallel storage'], answer: 0 },
  },
  {
    slug: 'evaluate-reverse-polish-notation',
    steps: sharedSteps('In postfix notation an operator always applies to the two most recent results, which is exactly the discipline a stack enforces. Operands wait until an operator asks for them.', 'Numbers pile up. An operator pops two, combines them, and pushes the single result back. The stack shrinks by one per operator, ending with the answer alone.'),
    hints: ['Push numbers; on an operator pop two and push the result.', 'Order matters: the first pop is the right operand.', 'Division truncates toward zero, not downward.'],
    checkpoint: { question: 'Why is the first value popped the right-hand operand?', choices: ['It was pushed most recently', 'Stacks pop in sorted order', 'It is always the larger value'], answer: 0 },
  },
  {
    slug: 'car-fleet',
    steps: sharedSteps('A car only matters relative to the cars ahead of it. Sorting by position from the destination backwards, a car forms a new fleet only if it would arrive later than everything already ahead; otherwise it is absorbed.', 'Compute each car arrival time if unobstructed. Walking from the car nearest the target backwards, each arrival time larger than the running maximum starts a fleet; anything smaller catches up and merges.'),
    hints: ['Sort by position, closest to the target first.', 'Arrival time is (target - position) / speed.', 'A car joins the fleet ahead when its time is not greater.'],
    checkpoint: { question: 'Why does a smaller arrival time mean the car joins the fleet ahead?', choices: ['It is faster overall', 'It would catch the slower fleet before the destination', 'It started closer'], answer: 1 },
  },
  {
    slug: 'largest-rectangle-in-histogram',
    steps: sharedSteps('Every bar defines a rectangle whose height is the bar and whose width runs until a shorter bar stops it on each side. A stack of increasing heights finds both limits, because a bar is popped exactly when its right limit appears.', 'Bars push while heights rise. A shorter bar arriving pops the taller ones, and each pop knows its own start index, so the width is measurable at that moment. A sentinel at the end flushes what remains.'),
    hints: ['Keep the stack heights increasing.', 'On a pop, width is the current index minus the popped start.', 'The popped start becomes the start of the bar being pushed.'],
    checkpoint: { question: 'When is a bar final width known?', choices: ['When it is pushed', 'When a shorter bar forces it off the stack', 'After every bar is processed'], answer: 1 },
  },
  {
    slug: 'binary-search',
    steps: sharedSteps('Order means a single comparison rules out half the remaining candidates. Keeping an explicit low and high boundary and always testing the midpoint is what makes the discard safe.', 'The live range shrinks by half each step. When low passes high the range is empty and the target was never there.'),
    hints: ['Compute mid as low + (high - low) / 2 to avoid overflow.', 'Move low past mid, or high below mid; never leave mid in place.', 'The loop ends when low exceeds high.'],
    checkpoint: { question: 'Why compute mid as low + (high - low) / 2?', choices: ['It is faster', 'It avoids overflow that (low + high) can cause', 'It rounds differently'], answer: 1 },
  },
  {
    slug: 'search-a-2d-matrix',
    steps: sharedSteps('The rows are sorted and each row starts above where the last ended, so the whole matrix reads as one sorted sequence. Treating an index into that sequence and converting it back to a row and column lets a single binary search work.', 'Imagine the rows laid end to end. A midpoint index divides by the column count to find its row, and the remainder gives its column.'),
    hints: ['Search the range 0 to rows * cols - 1.', 'Row is index / cols, column is index % cols.', 'No two-stage search is needed.'],
    checkpoint: { question: 'What property lets the matrix be treated as one sorted array?', choices: ['Every row is the same length', 'Each row first value exceeds the previous row last', 'The values are positive'], answer: 1 },
  },
  {
    slug: 'find-minimum-in-rotated-sorted-array',
    steps: sharedSteps('A rotation leaves exactly one place where the order breaks, and the minimum sits there. Comparing the midpoint with the right edge says which side of the break you are on.', 'If the midpoint is larger than the right edge, the break is to the right, so the search moves past mid. Otherwise mid could itself be the minimum, so it is kept.'),
    hints: ['Compare with the right edge, not the left.', 'A mid larger than the right edge means the pivot is further right.', 'Do not exclude mid when moving the high boundary.'],
    checkpoint: { question: 'Why compare the midpoint with the right edge rather than the left?', choices: ['The right edge is always the maximum', 'It distinguishes the rotated half unambiguously', 'The left edge may be undefined'], answer: 1 },
  },
  {
    slug: 'time-based-key-value-store',
    steps: sharedSteps('Timestamps arrive in increasing order for a key, so its list is already sorted and never needs re-sorting. A query then becomes a binary search for the rightmost entry at or before the wanted time.', 'Each key owns its own timeline. A get lands between two entries and takes the one to its left; falling before the first entry means there is nothing to return.'),
    hints: ['Append on set; the list stays sorted by construction.', 'Binary search for the largest timestamp not exceeding the query.', 'Keep the best candidate as you narrow, then return it.'],
    checkpoint: { question: 'Why does the per-key list never need sorting?', choices: ['Sets arrive with non-decreasing timestamps', 'The keys are sorted', 'Each key stores only one value'], answer: 0 },
  },
  {
    slug: 'median-of-two-sorted-arrays',
    steps: sharedSteps('The median only needs the arrays split so that everything on the left is at most everything on the right, with the halves the right size. Choosing how many elements to take from the smaller array fixes the rest, so you binary search that single number.', 'A cut through both arrays at once. Four values sit around the cut; when the left of each is below the right of the other, the cut is correct and the answer is read from those four.'),
    hints: ['Binary search over the smaller array so the range stays small.', 'The count taken from the second array is determined by the first.', 'Use infinities for the edges so the comparisons need no special cases.'],
    checkpoint: { question: 'What condition proves the split is correct?', choices: ['The halves are equal in size', 'Each left value is at most the opposite right value', 'The midpoints are equal'], answer: 1 },
  },
  {
    slug: 'merge-two-sorted-lists',
    steps: sharedSteps('Both lists are already sorted, so the next node of the answer is always the smaller of the two heads. A dummy head removes the special case of attaching the very first node.', 'Two pointers walk their lists while a tail pointer grows the result. When one list runs out, the remainder of the other is already sorted and can be attached whole.'),
    hints: ['Use a dummy node so the first append needs no branch.', 'Advance only the list you took from.', 'Attach the non-empty remainder instead of looping it.'],
    checkpoint: { question: 'Why can the leftover list be attached in one step?', choices: ['It is empty by then', 'It is already sorted and all larger', 'It must be reversed first'], answer: 1 },
  },
  {
    slug: 'linked-list-cycle',
    steps: sharedSteps('On a looping track a faster runner must eventually lap a slower one, and on a straight track it simply reaches the end. Moving one pointer two steps for every one of the other turns cycle detection into a meeting test with no extra memory.', 'Slow advances one, fast advances two. On a loop the gap closes by one each step, so they must coincide. Off a loop, fast runs out of list.'),
    hints: ['Advance fast by two and slow by one.', 'Guard both fast and fast.next before stepping.', 'Meeting means a cycle; reaching null means none.'],
    checkpoint: { question: 'Why must the pointers meet if a cycle exists?', choices: ['The list is finite', 'Inside the loop the gap shrinks by one each step', 'They start at the same node'], answer: 1 },
  },
  {
    slug: 'reorder-list',
    steps: sharedSteps('The target order interleaves the front with the reversed back. Doing that directly is awkward, but splitting at the middle, reversing the second half, and zipping the two halves is three familiar steps.', 'Find the middle with a fast and slow walk, cut there, reverse the tail, then alternate nodes from each half until the shorter one runs out.'),
    hints: ['Use fast and slow pointers to find the split point.', 'Terminate the first half before reversing the second.', 'Save both next pointers before relinking during the zip.'],
    checkpoint: { question: 'Why terminate the first half before reversing the second?', choices: ['To free memory', 'Otherwise the halves stay connected and the reverse creates a cycle', 'To count the nodes'], answer: 1 },
  },
  {
    slug: 'remove-nth-node-from-end-of-list',
    steps: sharedSteps('You cannot count from the end of a singly linked list, but you can create a fixed gap. Advance one pointer n nodes first; when it reaches the end, the other is exactly n from the end.', 'Two pointers separated by n. They travel together until the leader falls off the end, at which point the follower sits on the node before the target.'),
    hints: ['A dummy head makes removing the first node uniform.', 'Advance the leader n steps before moving both.', 'Stop when the leader next is null to land one before the target.'],
    checkpoint: { question: 'Why start from a dummy node?', choices: ['It removes the special case of deleting the head', 'It counts the nodes', 'It speeds up traversal'], answer: 0 },
  },
  {
    slug: 'copy-list-with-random-pointer',
    steps: sharedSteps('You cannot wire a random pointer until its target clone exists, so separate creation from linking. Create every clone first, remembering which original each belongs to, then make a second pass to connect them.', 'Pass one produces a parallel set of nodes and a map from old to new. Pass two reads each original pointer, looks up its clone, and writes the corresponding link.'),
    hints: ['Map original node to cloned node.', 'Do not attempt to link during the first pass.', 'Null maps to null, which the lookup can return naturally.'],
    checkpoint: { question: 'Why do the clones need two passes?', choices: ['Random pointers may target nodes not yet created', 'Copies are slow', 'The list may contain cycles'], answer: 0 },
  },
  {
    slug: 'find-the-duplicate-number',
    steps: sharedSteps('Treating each value as a pointer to another index turns the array into a linked structure, and a repeated value means two indices point to the same place. That is a cycle, so cycle detection finds the duplicate without modifying the array.', 'Follow index to value to index. Fast and slow meet inside the loop; restarting one pointer from the beginning and stepping both one at a time makes them meet at the entrance, which is the duplicate.'),
    hints: ['Read nums[i] as the next index.', 'Find the meeting point with fast and slow pointers.', 'Then walk one pointer from index 0 in lockstep to find the entrance.'],
    checkpoint: { question: 'Why does a duplicate value create a cycle?', choices: ['The array is unsorted', 'Two different indices point to the same next index', 'The values exceed the length'], answer: 1 },
  },
  {
    slug: 'lru-cache',
    steps: sharedSteps('The cache needs two things at once: instant lookup by key, and instant knowledge of which key is least recently used. A hash map gives the first and an ordering structure gives the second, and every access has to update both.', 'Entries live in recency order. A get moves its entry to the most recent end; a put that overflows removes the entry at the least recent end. Both ends are reachable in constant time.'),
    hints: ['A JavaScript Map preserves insertion order, which can serve as the recency list.', 'Delete and reinsert a key to move it to the most recent end.', 'Evict the first key returned by the iterator when over capacity.'],
    checkpoint: { question: 'Why must a get also modify the structure?', choices: ['To refresh the value', 'Reading counts as use, so recency order changes', 'To check capacity'], answer: 1 },
  },
  {
    slug: 'merge-k-sorted-lists',
    steps: sharedSteps('Merging two sorted lists is easy, so the question is how often each node is copied. Merging pairs and halving the number of lists each round means every node passes through only log k merges.', 'Lists pair off into half as many, then half again, like a knockout bracket. The depth of the bracket is log k, and each level touches every node once.'),
    hints: ['Reuse a two-list merge as the primitive.', 'Pair lists up each round, allowing for an odd one out.', 'A sequential fold instead would cost O(n * k).'],
    checkpoint: { question: 'Why merge in pairs rather than folding one list at a time?', choices: ['It uses less memory', 'Each node then passes through only log k merges', 'Pairs are easier to code'], answer: 1 },
  },
  {
    slug: 'reverse-nodes-in-k-group',
    steps: sharedSteps('Reversal itself is the familiar three-pointer walk; the work here is doing it in bounded runs and stitching the runs back together. Before reversing a group you must confirm k nodes exist, since a short tail is left alone.', 'Look ahead k nodes. If they are there, reverse exactly that span, then reconnect the node before the group to the new head and remember the old head as the new join point.'),
    hints: ['Walk k nodes first to confirm a full group.', 'Reverse until you reach the node after the group.', 'The old group head becomes the previous pointer for the next round.'],
    checkpoint: { question: 'Why check for k nodes before reversing?', choices: ['To size the buffer', 'A trailing group shorter than k must stay in order', 'To count the list length'], answer: 1 },
  },
  {
    slug: 'invert-binary-tree',
    steps: sharedSteps('Inverting a tree is the same instruction repeated everywhere: swap a node two children, then invert each of them. Because the work at a node does not depend on its subtrees, the order of the swap and the recursion does not matter.', 'Every node trades its left and right pointers. The change ripples down until it reaches nulls, at which point the whole shape has been mirrored.'),
    hints: ['Swap the children at the current node.', 'Recurse into both children.', 'A null node is the base case and needs no work.'],
    checkpoint: { question: 'Why can the swap happen before or after the recursion?', choices: ['The tree is balanced', 'Swapping a node children does not change what its subtrees contain', 'Recursion is depth-first'], answer: 1 },
  },
  {
    slug: 'maximum-depth-of-binary-tree',
    steps: sharedSteps('Depth is defined in terms of itself: the depth of a tree is one more than the deeper of its two subtrees. An empty tree has depth zero, which grounds the recursion.', 'Each call returns a number upward. Leaves return one, and every parent adds itself to the larger of the two answers it receives.'),
    hints: ['Return 0 for a null node.', 'Take the maximum of the two child depths.', 'Add one for the current node.'],
    checkpoint: { question: 'What does each recursive call return?', choices: ['The number of nodes below it', 'The depth of the subtree rooted at that node', 'The depth of the whole tree'], answer: 1 },
  },
  {
    slug: 'diameter-of-binary-tree',
    steps: sharedSteps('The longest path bends at exactly one node, joining the deepest reach on each side. So compute heights as usual, but at every node also score the path that passes straight through it, keeping the best seen.', 'Each call returns height upward while quietly recording left plus right as a candidate answer. The returned value and the recorded value are deliberately different quantities.'),
    hints: ['Return height, but record left + right at each node.', 'The diameter counts edges, so no plus one on the recorded value.', 'Keep the best in a variable outside the recursion.'],
    checkpoint: { question: 'Why does the function return height rather than the diameter?', choices: ['Height is cheaper to compute', 'A parent needs the height, while the diameter is recorded separately', 'They are the same value'], answer: 1 },
  },
  {
    slug: 'balanced-binary-tree',
    steps: sharedSteps('Balance is a property of every node, not just the root, so a naive check recomputes heights repeatedly. Returning an impossible height instead lets a single traversal carry the failure upward and stop early.', 'Heights flow up as usual until some node differs by more than one. From that point the sentinel value propagates to the root without further work.'),
    hints: ['Return -1 to mean unbalanced.', 'Check for -1 from each child before using it.', 'Otherwise return the normal height.'],
    checkpoint: { question: 'What does the sentinel value achieve?', choices: ['It marks empty subtrees', 'It reports failure upward without a second traversal', 'It counts the imbalance'], answer: 1 },
  },
  {
    slug: 'same-tree',
    steps: sharedSteps('Two trees match when their roots match and, recursively, their left subtrees and right subtrees match. Every disagreement, including one node existing where the other has null, is a mismatch.', 'The two trees are walked in lockstep. The recursion short-circuits the moment a pair disagrees, so unequal trees are usually rejected early.'),
    hints: ['Both null is a match; one null is not.', 'Compare values before recursing.', 'Both subtree comparisons must hold.'],
    checkpoint: { question: 'Why is one null and one node a mismatch rather than a skip?', choices: ['Null is never equal to anything', 'The shapes differ, and structure is part of equality', 'It would cause an error'], answer: 1 },
  },
  {
    slug: 'subtree-of-another-tree',
    steps: sharedSteps('This is the same-tree check applied at every possible anchor. Walk the big tree, and at each node ask whether the subtree rooted there is identical to the target.', 'Two nested walks: an outer traversal choosing anchors, and an inner comparison that runs to completion or fails fast. Most anchors fail on the very first value.'),
    hints: ['Reuse an exact same-tree comparison as a helper.', 'Try the comparison at the current node first.', 'Then recurse into both children.'],
    checkpoint: { question: 'Why is a value match at the root not enough?', choices: ['Values may repeat, so the whole structure must agree', 'Roots are never compared', 'The subtree may be larger'], answer: 0 },
  },
  {
    slug: 'lowest-common-ancestor-of-a-binary-search-tree',
    steps: sharedSteps('In a search tree the values themselves say which way each target lies. While both targets are on the same side you can descend confidently; the first node where they part ways, or that is itself a target, is the answer.', 'A single path down from the root. Both values smaller means go left, both larger means go right, and anything else means the split has happened here.'),
    hints: ['Compare both targets with the current value.', 'Descend only while both go the same way.', 'No recursion is required; a loop suffices.'],
    checkpoint: { question: 'Why is the first split point the lowest common ancestor?', choices: ['It is the deepest node', 'Below it the targets lie in different subtrees', 'It is always the root'], answer: 1 },
  },
  {
    slug: 'binary-tree-right-side-view',
    steps: sharedSteps('What you see from the right is the last node of each level, so this is a level-order traversal that keeps one node per level. The traversal is unchanged; only what you record differs.', 'Each level is gathered as a frontier. The rightmost entry of the frontier is appended to the answer before the next frontier is built.'),
    hints: ['Process the tree one full level at a time.', 'Take the last node of each level.', 'An empty tree yields an empty list.'],
    checkpoint: { question: 'Why does the traversal itself not change?', choices: ['The tree is a BST', 'Only the selection from each level differs', 'Right-side views need depth-first search'], answer: 1 },
  },
  {
    slug: 'count-good-nodes-in-binary-tree',
    steps: sharedSteps('Whether a node is good depends on the path taken to reach it, not on its subtrees. So carry the largest value seen on the way down, and each node compares itself against that single number.', 'A value flows downward, only ever growing. Each node checks itself against the incoming maximum, contributes one or zero, and passes the updated maximum to its children.'),
    hints: ['Pass the running maximum as a parameter.', 'A node is good when it is at least that maximum.', 'Start with negative infinity so the root always counts.'],
    checkpoint: { question: 'Why is the maximum passed down rather than returned up?', choices: ['It is faster', 'Goodness depends on the ancestors, not the descendants', 'Returning it would lose the root'], answer: 1 },
  },
  {
    slug: 'kth-smallest-element-in-a-bst',
    steps: sharedSteps('An in-order walk of a search tree visits values in ascending order, so the kth value visited is the answer. An explicit stack lets the walk stop the instant it is reached rather than traversing everything.', 'Descend left, pushing as you go. Pop to visit, counting down. Then move right and repeat. The walk halts mid-tree once the count hits zero.'),
    hints: ['Push left children until there are none.', 'Popping a node visits it in sorted order.', 'Decrement k on each visit and stop at zero.'],
    checkpoint: { question: 'Why does an in-order traversal give sorted values?', choices: ['The tree is balanced', 'Everything left of a node is smaller and everything right is larger', 'The stack sorts them'], answer: 1 },
  },
  {
    slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
    steps: sharedSteps('Preorder tells you the root of every subtree, in the order they are needed. Inorder tells you, once you know a root, exactly how many nodes fall on each side of it. Together they pin down the shape.', 'Take the next preorder value as a root, find it in the inorder sequence, and the values to its left and right become the two subtrees. Recurse into each range.'),
    hints: ['Index the inorder positions so the lookup is constant.', 'Consume preorder values in order with a single moving pointer.', 'Build the left subtree before the right, matching preorder.'],
    checkpoint: { question: 'What does the position in the inorder sequence tell you?', choices: ['The depth of the node', 'How many nodes lie in each subtree', 'Whether the node is a leaf'], answer: 1 },
  },
  {
    slug: 'binary-tree-maximum-path-sum',
    steps: sharedSteps('A path bends at one node, so each node scores the full arch through it while returning only the better single arm to its parent. Negative arms are worth dropping, which is what clamping at zero expresses.', 'From each node two values are considered: left plus right plus itself, which is recorded, and the single best downward extension, which is returned. Clamping negatives to zero means an unhelpful branch is simply not taken.'),
    hints: ['Clamp each child contribution at zero.', 'Record value + left + right as a candidate answer.', 'Return value plus the better single side.'],
    checkpoint: { question: 'Why clamp a negative child contribution to zero?', choices: ['Negative values are invalid', 'Not extending into that branch is always at least as good', 'To avoid overflow'], answer: 1 },
  },
  {
    slug: 'serialize-and-deserialize-binary-tree',
    steps: sharedSteps('A traversal alone is ambiguous because different shapes can produce the same visit order. Writing an explicit marker for every missing child removes the ambiguity, so one preorder string fully determines the tree.', 'The output is a stream where every node is followed by its two subtrees, and absence is written down too. Rebuilding consumes the stream in the same order, so structure falls out naturally.'),
    hints: ['Emit a placeholder for null children.', 'Deserialize with a moving index over the tokens.', 'Build left then right, matching how it was written.'],
    checkpoint: { question: 'Why record nulls explicitly?', choices: ['To measure the tree size', 'Without them the same sequence could describe different shapes', 'To make the string shorter'], answer: 1 },
  },
  {
    slug: 'kth-largest-element-in-a-stream',
    steps: sharedSteps('You never need the whole stream in order, only the boundary between the top k and the rest. A min-heap capped at size k keeps exactly the top k, and its root is the kth largest by definition.', 'Values arrive and join the heap. Whenever the heap exceeds k, the smallest is discarded because it can no longer be in the top k. The root is always the answer.'),
    hints: ['Use a min-heap, not a max-heap.', 'Pop whenever the size exceeds k.', 'The root is the kth largest after every add.'],
    checkpoint: { question: 'Why is the root of a size-k min-heap the kth largest?', choices: ['It is the smallest of the k largest values', 'It is the largest value seen', 'Heaps are fully sorted'], answer: 0 },
  },
  {
    slug: 'last-stone-weight',
    steps: sharedSteps('Each turn needs the two heaviest stones, and the result of smashing them re-enters the pile. A max-heap answers both needs: it surrenders its largest element cheaply and accepts a new one just as cheaply.', 'Two stones leave the top, their difference returns if non-zero, and the pile shrinks by at least one each round until one or none remain.'),
    hints: ['Build a max-heap from the stones.', 'Pop twice and push back the difference when it is non-zero.', 'Stop when fewer than two remain.'],
    checkpoint: { question: 'Why re-insert the difference rather than track it separately?', choices: ['It must compete for heaviest in later rounds', 'It keeps the heap balanced', 'Differences are always small'], answer: 0 },
  },
  {
    slug: 'k-closest-points-to-origin',
    steps: sharedSteps('Distances only need to be compared, never reported, so the square root is unnecessary work that also introduces floating point error. Keeping a max-heap of size k then discards the current farthest as better candidates arrive.', 'Points join a heap ordered by squared distance, largest at the top. Once the heap holds more than k, the top is dropped, so what survives is exactly the k nearest.'),
    hints: ['Compare x*x + y*y and skip the square root.', 'Use a max-heap so the worst kept point is at the top.', 'Pop as soon as the size passes k.'],
    checkpoint: { question: 'Why is a max-heap correct when finding the closest points?', choices: ['It sorts ascending', 'The top is the worst of the kept set, so it is the one to drop', 'Min-heaps cannot hold pairs'], answer: 1 },
  },
  {
    slug: 'task-scheduler',
    steps: sharedSteps('The schedule length is dictated by the most frequent task, which must be separated by the cooldown every time it repeats. That builds a fixed frame of slots; other tasks fill the gaps, and only if the frame is too small does the raw task count take over.', 'Lay out the most frequent task with n gaps between each occurrence. Other tasks drop into those gaps. If they overflow, no idling is needed at all and the answer is simply the number of tasks.'),
    hints: ['Find the highest frequency and how many tasks share it.', 'The frame is (maxCount - 1) * (n + 1) plus the number of tasks at that frequency.', 'The answer is the larger of the frame and the total task count.'],
    checkpoint: { question: 'Why take the maximum of the frame and the total task count?', choices: ['Frames can be negative', 'Enough distinct tasks fill every gap, leaving no idle time', 'The frame ignores cooldown'], answer: 1 },
  },
  {
    slug: 'design-twitter',
    steps: sharedSteps('A feed is a merge of several time-ordered streams, so each tweet needs a global ordering key. A monotonically increasing counter gives that without relying on wall-clock time, and only the newest few tweets per source can matter.', 'Each user keeps their own tweet list in arrival order. Building a feed gathers the tail of each followed list and selects the ten most recent across all of them.'),
    hints: ['Stamp every tweet with an increasing counter.', 'A user always sees their own tweets.', 'Only the last ten from each source can reach the top ten.'],
    checkpoint: { question: 'Why is a counter preferable to a timestamp here?', choices: ['Counters use less memory', 'It guarantees a strict order even for tweets in the same instant', 'Timestamps are unavailable'], answer: 1 },
  },
  {
    slug: 'combination-sum-ii',
    steps: sharedSteps('Each number may be used once, and the input may repeat values, so the risk is emitting the same combination by different routes. Sorting brings equal values together, and skipping a value identical to the previous one at the same depth removes the duplicates without losing any distinct answer.', 'The search tree branches over positions. At one level, repeated values would start identical branches, so only the first is explored; deeper levels may still use the later copies.'),
    hints: ['Sort first so duplicates are adjacent.', 'Skip a candidate equal to the previous one only when it is not the first at this level.', 'Advance the index by one, since each number is used at most once.'],
    checkpoint: { question: 'Why is the duplicate skip conditioned on not being the first choice at this level?', choices: ['To keep the answer sorted', 'Later copies are still needed deeper in the same combination', 'It would otherwise never trigger'], answer: 1 },
  },
  {
    slug: 'permutations',
    steps: sharedSteps('A permutation uses every element exactly once, so the only state needed is which elements remain available. Marking an element used, recursing, then unmarking it explores each arrangement exactly once.', 'At depth d the path holds d chosen elements and the used flags mark them. Every unused element is a branch, so the tree has n choices at the top, n-1 below, and so on.'),
    hints: ['Track a used flag per index.', 'A complete path is one whose length equals the input.', 'Unmark after recursing so siblings see the element again.'],
    checkpoint: { question: 'Why unmark an element after its branch returns?', choices: ['To free memory', 'So sibling branches can still use it', 'To keep the flags sorted'], answer: 1 },
  },
  {
    slug: 'subsets-ii',
    steps: sharedSteps('With duplicates present, two different positions holding the same value would generate the same subset twice. Sorting makes those positions adjacent, so skipping repeats at the same level keeps every distinct subset and no more.', 'Every node in the search tree is itself a subset, recorded on arrival. Branches that would repeat a value already tried at this level are pruned before they start.'),
    hints: ['Sort the input first.', 'Record the current path at every node, not only at leaves.', 'Skip nums[i] when it equals nums[i-1] and i is past the level start.'],
    checkpoint: { question: 'Why record the path at every node rather than only at leaves?', choices: ['Leaves are unreachable', 'Every prefix is itself a valid subset', 'It avoids copying'], answer: 1 },
  },
  {
    slug: 'generate-parentheses',
    steps: sharedSteps('A string is well formed exactly when it never closes more than it has opened and ends balanced. Enforcing those two conditions as you build means every string you produce is valid, so no filtering step is needed.', 'The search tree branches on open or close. An open branch exists while fewer than n have been used; a close branch exists while closers trail openers. Leaves are complete valid strings.'),
    hints: ['Track how many of each bracket have been placed.', 'Only close when closers are behind openers.', 'The string is complete at length 2n.'],
    checkpoint: { question: 'Why does this need no validity check at the end?', choices: ['The rules prevent an invalid string ever being built', 'Invalid strings are discarded later', 'All strings of length 2n are valid'], answer: 0 },
  },
  {
    slug: 'word-search',
    steps: sharedSteps('The word is built by walking neighbouring cells, and a cell may not be reused within one attempt. Temporarily overwriting the cell marks it as taken for the current path, and restoring it on the way out frees it for other paths.', 'A depth-first walk from every starting cell. Matching characters extend the path; a mismatch or a boundary ends that branch, and the mark is undone as the recursion unwinds.'),
    hints: ['Check bounds and the character before recursing.', 'Overwrite the cell with a sentinel while it is in use.', 'Restore the original character before returning.'],
    checkpoint: { question: 'Why restore the cell after the recursion returns?', choices: ['The grid is read-only', 'Other paths must be free to use that cell', 'To keep the characters sorted'], answer: 1 },
  },
  {
    slug: 'palindrome-partitioning',
    steps: sharedSteps('Cutting the string anywhere produces a prefix and a remainder, but only a palindromic prefix is worth pursuing. Checking the prefix before recursing prunes the search tree hard and guarantees every piece of every answer is valid.', 'From each start position, every possible end produces a candidate prefix. Only the palindromic ones open a branch, and the branch continues from just after the cut.'),
    hints: ['Try every end position from the current start.', 'Verify the piece is a palindrome before recursing.', 'A path is complete when the start reaches the end of the string.'],
    checkpoint: { question: 'Why test the prefix before recursing rather than validating at the end?', choices: ['It prunes branches that can never produce a valid answer', 'Palindromes are cheaper at the end', 'The recursion would not terminate'], answer: 0 },
  },
  {
    slug: 'letter-combinations-of-a-phone-number',
    steps: sharedSteps('Each digit contributes one character and the digits are independent, so the structure is a tree of fixed depth with one level per digit. The branching factor is just how many letters that key carries.', 'Level i chooses a letter for digit i. Every root-to-leaf path spells one combination, and the number of leaves is the product of the letters per digit.'),
    hints: ['Map each digit to its letters.', 'Recurse on the digit index.', 'An empty input produces an empty list, not a list with an empty string.'],
    checkpoint: { question: 'What determines the depth of the search tree?', choices: ['The number of letters on a key', 'The number of digits in the input', 'The size of the alphabet'], answer: 1 },
  },
  {
    slug: 'n-queens',
    steps: sharedSteps('Placing one queen per row removes row conflicts by construction, leaving columns and the two diagonal directions to check. Each diagonal has a constant identity along its length, so membership sets make every conflict test constant time.', 'The search descends one row at a time. For each column, three sets are consulted; a free column places a queen and recurses, and backing out removes the three marks again.'),
    hints: ['One queen per row makes rows automatically safe.', 'Cells on a diagonal share row minus column; the anti-diagonal shares row plus column.', 'Remove all three marks when undoing a placement.'],
    checkpoint: { question: 'Why do row minus column and row plus column identify diagonals?', choices: ['They are always positive', 'Each stays constant along its diagonal', 'They equal the board size'], answer: 1 },
  },
  {
    slug: 'design-add-and-search-words-data-structure',
    steps: sharedSteps('Adding words is an ordinary trie insert. Searching differs only at a wildcard, where instead of following one child you must try them all, which turns lookup into a small depth-first search.', 'A concrete character narrows to a single child. A dot fans out across every child at that node, and any branch that reaches the end of the pattern on a word marks success.'),
    hints: ['Insertion is unchanged from a plain trie.', 'On a dot, recurse into every child.', 'Success requires both reaching the pattern end and an end-of-word flag.'],
    checkpoint: { question: 'Why does a wildcard turn lookup into a search?', choices: ['The trie is unsorted', 'Several children could match, so branches must be tried', 'Dots are stored as nodes'], answer: 1 },
  },
  {
    slug: 'word-search-ii',
    steps: sharedSteps('Running a separate grid search per word repeats the same walks many times. Putting the words in a trie lets one traversal of the grid pursue every word at once, and a path dies as soon as no word shares that prefix.', 'The grid walk and the trie descend together. A cell that has no matching trie child ends the branch immediately, no matter how many words remain in the dictionary.'),
    hints: ['Build the trie from all words first.', 'Walk the grid and the trie in step.', 'Clear a word from the trie once found, so it is not reported twice.'],
    checkpoint: { question: 'What ends a branch early in this search?', choices: ['The cell is already visited', 'No word in the dictionary continues with that prefix', 'The word length is exceeded'], answer: 1 },
  },
  {
    slug: 'max-area-of-island',
    steps: sharedSteps('This is the same flood fill that counts islands, except each fill reports a size instead of nothing. Making the recursion return one plus its neighbours turns the traversal into a sum.', 'Each unvisited land cell starts a fill that sinks everything it reaches while accumulating a count. The largest count across all starts is the answer.'),
    hints: ['Return 0 for water or out of bounds.', 'Mark the cell before recursing to avoid revisits.', 'Sum one plus the four recursive results.'],
    checkpoint: { question: 'Why mark the cell before recursing rather than after?', choices: ['It keeps the grid sorted', 'Otherwise neighbours can revisit it and recurse forever', 'It is faster'], answer: 1 },
  },
  {
    slug: 'clone-graph',
    steps: sharedSteps('A graph may contain cycles, so naive recursion would revisit nodes forever. Registering a clone in a map before exploring its neighbours makes the map serve as both the memo and the visited set.', 'Each original node gains a counterpart the first time it is seen. Neighbour lists are filled afterwards by looking up counterparts, so a cycle simply finds an existing clone.'),
    hints: ['Create and store the clone before recursing.', 'Look up the map first; return the existing clone if present.', 'A null input clones to null.'],
    checkpoint: { question: 'Why register the clone before visiting neighbours?', choices: ['To allocate memory early', 'A cycle returning to this node must find it already cloned', 'Neighbours are unordered'], answer: 1 },
  },
  {
    slug: 'walls-and-gates',
    steps: sharedSteps('Running a search from every room would repeat work. Starting from every gate at once means distance grows uniformly outward, so the first time a room is reached is by its nearest gate.', 'All gates form the initial frontier at distance zero. Each expansion writes the next distance into untouched rooms, which become the following frontier. Walls are never entered.'),
    hints: ['Seed the queue with every gate before expanding.', 'Only write into rooms still marked as unreached.', 'The distance is the number of expansion rounds so far.'],
    checkpoint: { question: 'Why seed the search with all gates simultaneously?', choices: ['It avoids running a search per room', 'Gates cannot be visited twice', 'Walls would otherwise be entered'], answer: 0 },
  },
  {
    slug: 'rotting-oranges',
    steps: sharedSteps('Rot spreads to all neighbours at the same time, so each round of expansion is exactly one minute. Counting the fresh oranges up front lets you tell the difference between finishing and being unable to finish.', 'Every rotten orange expands together. A round converts its neighbours and decreases the fresh count. When no fresh remain the elapsed rounds are the answer; if some remain unreachable, it is impossible.'),
    hints: ['Seed the frontier with every rotten orange.', 'Count fresh oranges before starting.', 'Return -1 when fresh oranges survive the final round.'],
    checkpoint: { question: 'Why count the fresh oranges before the simulation?', choices: ['To size the queue', 'To detect oranges that can never be reached', 'To order the expansion'], answer: 1 },
  },
  {
    slug: 'pacific-atlantic-water-flow',
    steps: sharedSteps('Following water downhill from every cell repeats work, and the two oceans double it. Reversing the direction is the trick: start at each ocean edge and climb to cells that could have flowed down to it, then intersect the two sets.', 'One climb inland from the Pacific edges, another from the Atlantic. Cells reached by both are exactly the ones whose water can leave in either direction.'),
    hints: ['Start from the border cells of each ocean.', 'Move to a neighbour only when it is not lower than the current cell.', 'Intersect the two reachable sets at the end.'],
    checkpoint: { question: 'Why search upward from the oceans instead of downward from each cell?', choices: ['Uphill is cheaper to test', 'It replaces one search per cell with one per ocean', 'Water flows upward here'], answer: 1 },
  },
  {
    slug: 'surrounded-regions',
    steps: sharedSteps('A region survives exactly when it touches the border, since the border cannot be enclosed. Marking everything reachable from the edges as safe and then flipping the rest is easier than testing each region for enclosure.', 'A pass from every border cell paints the connected open regions with a temporary mark. A final sweep converts unmarked open cells to captured and restores the marked ones.'),
    hints: ['Start flood fills from the border cells only.', 'Use a temporary marker distinct from both real values.', 'A final sweep restores marks and captures the rest.'],
    checkpoint: { question: 'Why start from the border rather than testing each region?', choices: ['Border cells are fewer', 'Touching the border is exactly what makes a region safe', 'Regions cannot be enumerated'], answer: 1 },
  },
  {
    slug: 'course-schedule-ii',
    steps: sharedSteps('This is the same cycle test as before, but the order in which courses become unblocked is itself the answer. Recording each course as it is taken produces a valid schedule, and a short list proves a cycle blocked the rest.', 'Courses with nothing blocking them are taken in turn, each one potentially unblocking others. The sequence of removals is a topological order.'),
    hints: ['Track in-degrees and start with the zeros.', 'Append each course as it is taken.', 'A result shorter than numCourses means a cycle.'],
    checkpoint: { question: 'Why is the removal order a valid schedule?', choices: ['It is sorted by course number', 'A course is only taken once every prerequisite has been', 'Courses have at most one prerequisite'], answer: 1 },
  },
  {
    slug: 'graph-valid-tree',
    steps: sharedSteps('A tree on n nodes is connected and acyclic, which forces exactly n - 1 edges. Checking the edge count first turns the remaining work into a single question: does any edge join two nodes already connected?', 'Each node begins as its own group. Every edge merges two groups, and an edge whose endpoints already share a group closes a cycle. With the right edge count, no cycle implies connected.'),
    hints: ['Reject immediately unless there are exactly n - 1 edges.', 'Union the endpoints of each edge.', 'Finding both endpoints already joined means a cycle.'],
    checkpoint: { question: 'Why does the edge count check simplify the rest?', choices: ['It makes the union operations faster', 'With n - 1 edges, no cycle is the same as connected', 'It removes duplicate edges'], answer: 1 },
  },
  {
    slug: 'number-of-connected-components-in-an-undirected-graph',
    steps: sharedSteps('Start by assuming every node is its own component, then let the edges tell you which assumptions were wrong. Each edge that joins two previously separate groups reduces the count by one.', 'Nodes begin as n islands. An edge between different groups merges them and decrements the count; an edge inside a group changes nothing.'),
    hints: ['Initialise the count to the number of nodes.', 'Only decrement when the roots differ.', 'Path compression keeps the lookups nearly constant.'],
    checkpoint: { question: 'Why do some edges leave the count unchanged?', choices: ['They are duplicates', 'Their endpoints are already in the same component', 'They connect to themselves'], answer: 1 },
  },
  {
    slug: 'redundant-connection',
    steps: sharedSteps('A tree plus one edge has exactly one cycle, so the extra edge is the one whose endpoints were already connected when it arrived. Processing edges in order and watching for that moment identifies it directly.', 'Groups merge edge by edge. The first edge whose two endpoints already share a group is the one closing the cycle, and because input order is respected it is also the last such edge in the answer sense.'),
    hints: ['Process edges in the given order.', 'Return the edge whose endpoints already share a root.', 'No second pass is needed.'],
    checkpoint: { question: 'Why does processing in input order give the required edge?', choices: ['Edges are sorted by weight', 'The first edge that closes a cycle is the one to remove', 'Later edges are always redundant'], answer: 1 },
  },
  {
    slug: 'word-ladder',
    steps: sharedSteps('Each word is a node and an edge joins words differing in one letter, so the shortest transformation is a shortest path in an unweighted graph. Generating neighbours by trying every letter in every position avoids comparing all pairs of words.', 'The frontier expands one transformation at a time. Because every edge costs one, the first time the end word appears is along a shortest sequence.'),
    hints: ['Put the word list in a set for constant membership tests.', 'Generate neighbours by substituting each letter at each position.', 'Remove a word when enqueued so it is not revisited.'],
    checkpoint: { question: 'Why is breadth-first search the right choice here?', choices: ['The graph is a tree', 'Every transformation costs the same, so the first arrival is shortest', 'Depth-first would not terminate'], answer: 1 },
  },
  {
    slug: 'reconstruct-itinerary',
    steps: sharedSteps('Every ticket must be used exactly once, which makes this an Eulerian path rather than a shortest path. Greedily taking the smallest airport available works, provided a node is only committed to the answer once it has no tickets left.', 'Walk greedily until stuck. The airport you are stuck at must be the end of the route, so it is prepended. Unwinding continues, building the itinerary backwards.'),
    hints: ['Sort each destination list so the smallest is taken first.', 'Only append an airport once its ticket list is empty.', 'Reverse the collected order at the end.'],
    checkpoint: { question: 'Why is an airport added only once it has no tickets left?', choices: ['It saves memory', 'Getting stuck there means it must come later in the route', 'Tickets are sorted'], answer: 1 },
  },
  {
    slug: 'min-cost-to-connect-all-points',
    steps: sharedSteps('Connecting everything at least cost with no redundant links is a minimum spanning tree. Growing one tree and repeatedly absorbing the cheapest edge that reaches a new point is Prim algorithm, and it never needs to consider edges inside the tree.', 'The tree starts as a single point. Every point outside offers an edge; the cheapest is taken, that point joins, and it offers its own edges in turn.'),
    hints: ['Keep a flag per point for whether it is in the tree.', 'Push candidate edges to the newly added point neighbours.', 'Skip a popped edge whose endpoint has already joined.'],
    checkpoint: { question: 'Why can a popped edge be skipped?', choices: ['Its cost changed', 'Its endpoint has already joined, so the edge is redundant', 'It was pushed twice'], answer: 1 },
  },
  {
    slug: 'swim-in-rising-water',
    steps: sharedSteps('The cost of a route is not the sum of its cells but its highest cell, since you wait for the water to cover the worst point. Ordering the frontier by that running maximum makes the usual cheapest-first argument apply.', 'The frontier holds cells with the worst elevation encountered on the way to them. Popping the smallest such value settles it, and the first time the corner is popped that value is the answer.'),
    hints: ['The key is the maximum cell on the path, not the total.', 'Push neighbours with max(current, neighbour height).', 'Mark a cell seen when it is pushed.'],
    checkpoint: { question: 'Why is the path cost a maximum rather than a sum?', choices: ['Heights may be negative', 'You wait only for the single worst cell to be covered', 'Sums overflow'], answer: 1 },
  },
  {
    slug: 'alien-dictionary',
    steps: sharedSteps('Sorted words reveal ordering only at the first position where two adjacent words differ; everything after that is uninformative. Collecting one rule per adjacent pair builds a graph whose topological order is the alphabet.', 'Compare neighbouring words character by character until they diverge, and record that one letter precedes the other. Then peel letters with nothing before them, one at a time.'),
    hints: ['Only the first differing character yields a rule.', 'A longer word before its own prefix is invalid input.', 'A leftover letter means a cycle, so return the empty string.'],
    checkpoint: { question: 'Why do characters after the first difference tell you nothing?', choices: ['They may be identical', 'The ordering was already decided by the first difference', 'They belong to a different word'], answer: 1 },
  },
  {
    slug: 'cheapest-flights-within-k-stops',
    steps: sharedSteps('The stop limit is what rules out plain Dijkstra, because a cheaper route may use too many hops. Relaxing all edges a bounded number of times instead bounds the hops directly, provided each round reads a frozen copy of the previous one.', 'Round r holds the best cost reachable in at most r flights. Reading from a snapshot prevents an edge relaxed earlier in the same round from being used again, which would smuggle in an extra hop.'),
    hints: ['Run k + 1 rounds of relaxation.', 'Copy the cost array at the start of each round and read from the copy.', 'Skip edges from cities still unreachable.'],
    checkpoint: { question: 'Why read from a snapshot within each round?', choices: ['It is faster', 'Otherwise a single round could chain several flights', 'Arrays cannot be modified in place'], answer: 1 },
  },
  {
    slug: 'climbing-stairs',
    steps: sharedSteps('The last move onto step n came from either step n-1 or step n-2, and those routes are disjoint, so the counts simply add. That makes the recurrence the Fibonacci one.', 'Two numbers slide up the staircase: the count for the previous step and the one before it. Each step replaces them with their sum and the old previous.'),
    hints: ['Both base cases are one way.', 'Each step is the sum of the two below it.', 'Only two variables are needed, not an array.'],
    checkpoint: { question: 'Why do the two routes add rather than multiply?', choices: ['They are independent choices', 'They are disjoint sets of ways to arrive', 'Multiplication would overflow'], answer: 1 },
  },
  {
    slug: 'min-cost-climbing-stairs',
    steps: sharedSteps('You pay when you leave a step, not when you land, and you may start from either of the first two. So the cost to reach a position is the cheaper of arriving from one step back or two, each plus the cost of leaving that step.', 'Two running totals climb the staircase. Each new position takes the cheaper of the two ways to arrive, and the top is one past the last step.'),
    hints: ['The first two positions cost nothing to reach.', 'Arriving at i costs min(cost[i-1] + prev, cost[i-2] + prevPrev).', 'The target is one beyond the last index.'],
    checkpoint: { question: 'Why are the first two positions free?', choices: ['Their costs are zero', 'You may start on either without paying to arrive', 'They are skipped'], answer: 1 },
  },
  {
    slug: 'house-robber',
    steps: sharedSteps('At each house the choice is to skip it, keeping the best total so far, or rob it, adding its value to the best total from two houses back. Carrying those two totals forward is all the state required.', 'Two numbers move along the street: the best including the previous house, and the best excluding it. Each house recomputes the pair from the old one.'),
    hints: ['Track the best with and without the previous house.', 'Robbing house i adds to the total from i - 2.', 'Both start at zero.'],
    checkpoint: { question: 'Why is the total from two houses back the right base for robbing?', choices: ['Adjacent houses cannot both be robbed', 'It is always larger', 'Houses come in pairs'], answer: 0 },
  },
  {
    slug: 'house-robber-ii',
    steps: sharedSteps('The circle only adds one constraint: the first and last houses are adjacent, so they cannot both be taken. Running the straight-line solution twice, once excluding each end, covers every legal case.', 'Cut the circle in two different places to make two streets. Any valid circular plan omits at least one end, so it appears in one of the two runs.'),
    hints: ['Reuse the linear solution as a helper.', 'Run it on the array without the first element, and without the last.', 'A single house is a special case.'],
    checkpoint: { question: 'Why do two linear runs cover every circular case?', choices: ['The circle has two halves', 'Any valid plan must leave out the first or the last house', 'Ends are always skipped'], answer: 1 },
  },
  {
    slug: 'longest-palindromic-substring',
    steps: sharedSteps('Every palindrome has a centre, and there are only about 2n of them once you count the gaps between characters. Expanding outward from each centre finds the longest palindrome centred there in linear time.', 'Two pointers push apart from a centre while the characters match. Odd-length palindromes centre on a character, even-length ones on the gap between two.'),
    hints: ['Try both a single character and a pair as the centre.', 'Expand while the bounds hold and the characters match.', 'Record the start and length, not the substring, while scanning.'],
    checkpoint: { question: 'Why are there two kinds of centre?', choices: ['Even-length palindromes centre between characters', 'Some strings have no centre', 'Centres may repeat'], answer: 0 },
  },
  {
    slug: 'palindromic-substrings',
    steps: sharedSteps('This is the same centre expansion, but the quantity of interest changes: every successful expansion is itself a palindromic substring, so counting expansions counts substrings.', 'From each centre the pointers step outward, and each step that still matches adds one to the total before continuing.'),
    hints: ['Count each successful expansion, not just the longest.', 'Handle odd and even centres separately.', 'Single characters count as palindromes.'],
    checkpoint: { question: 'Why does each successful expansion add exactly one substring?', choices: ['It produces one new palindrome centred there', 'Expansions are always palindromic', 'Substrings are counted at the end'], answer: 0 },
  },
  {
    slug: 'decode-ways',
    steps: sharedSteps('The last letter used either one digit or two, so the count for a prefix is the sum of those two possibilities. What makes it more than Fibonacci is that each option has to be legal: no leading zero for one digit, and a value between ten and twenty-six for two.', 'Two running counts slide along the string. At each position they combine, but only the legal contributions are included, and a position with no legal option makes the whole string undecodable.'),
    hints: ['A zero cannot stand alone as a letter.', 'A two-digit value counts only when it lies between 10 and 26.', 'A position with zero ways means the answer is zero.'],
    checkpoint: { question: 'Why can the running count fall to zero mid-string?', choices: ['The string ended', 'No legal single or double digit reading exists there', 'Counts are capped'], answer: 1 },
  },
  {
    slug: 'maximum-product-subarray',
    steps: sharedSteps('A negative number flips the ordering, so the smallest product so far can become the largest after one multiplication. Tracking both extremes at every position is what keeps the recurrence correct.', 'Two running values travel the array: the largest and smallest product ending here. Each element produces three candidates, and the new pair is the extremes of those.'),
    hints: ['Keep both a running maximum and a running minimum.', 'Candidates are the element alone and the element times each running value.', 'Update both before recording the best.'],
    checkpoint: { question: 'Why track the minimum product as well?', choices: ['To detect zeros', 'A negative element turns the smallest product into the largest', 'Minimums are the answer'], answer: 1 },
  },
  {
    slug: 'word-break',
    steps: sharedSteps('Ask whether each prefix is breakable. A prefix works when some earlier breakable point is followed by a dictionary word, so the answer for a longer prefix is built from shorter ones already settled.', 'A row of flags, one per prefix length, starting with the empty prefix marked true. Each new position looks back for a true flag with a valid word bridging the gap.'),
    hints: ['The empty prefix is breakable by definition.', 'For each end, try every start before it.', 'Stop at the first working split for that end.'],
    checkpoint: { question: 'What does a true flag at position i mean?', choices: ['The first i characters can be segmented', 'The word ends at i', 'Position i is a dictionary word'], answer: 0 },
  },
  {
    slug: 'partition-equal-subset-sum',
    steps: sharedSteps('Two equal halves means one subset must sum to exactly half the total, so an odd total is immediately impossible. The question then becomes which sums are reachable, a knapsack over the numbers.', 'A row of reachable sums, seeded with zero. Each number marks new sums reachable by adding it, and the sweep runs backwards so a number is never used twice in one pass.'),
    hints: ['An odd total can be rejected at once.', 'Target is half the total.', 'Iterate sums downward so each number is used once.'],
    checkpoint: { question: 'Why iterate the sums downward for each number?', choices: ['To finish sooner', 'So the same number is not counted more than once', 'Sums are sorted descending'], answer: 1 },
  },
  {
    slug: 'best-time-to-buy-and-sell-stock-with-cooldown',
    steps: sharedSteps('The cooldown means a day is not enough context; you also need to know what happened yesterday. Three states capture it exactly: holding a share, having just sold, and being free to buy.', 'Three running values update together each day. Selling moves from holding to sold, buying moves from free to holding, and free absorbs yesterday sold state, which is what enforces the rest day.'),
    hints: ['Track holding, just-sold and free totals.', 'Use yesterday sold value when updating free.', 'The answer is the better of sold and free at the end.'],
    checkpoint: { question: 'Why must free read yesterday just-sold value?', choices: ['It is larger', 'That one-day delay is the cooldown', 'Sold is otherwise unused'], answer: 1 },
  },
  {
    slug: 'coin-change-ii',
    steps: sharedSteps('Counting combinations rather than permutations depends entirely on loop order. Putting the coin loop outside means each combination is built in one fixed coin order, so the same set is never counted twice.', 'Coins are introduced one at a time. After each coin, the table holds the number of ways using only the coins seen so far, so no ordering variations creep in.'),
    hints: ['Loop coins outside and amounts inside.', 'Seed the zero amount with one way.', 'Swapping the loops counts permutations instead.'],
    checkpoint: { question: 'What does swapping the loop order compute instead?', choices: ['Nothing changes', 'Permutations, which count the same set several times', 'The minimum coin count'], answer: 1 },
  },
  {
    slug: 'target-sum',
    steps: sharedSteps('Every number is added or subtracted, so the reachable totals branch in two at each step. Counting how many ways each running total can be reached collapses the exponential tree into a table keyed by sum.', 'A map from running total to the number of ways to reach it. Each number replaces the map with a new one where every total spawns two successors.'),
    hints: ['Start with a single way to reach zero.', 'Each number produces sum plus and sum minus entries.', 'Accumulate counts when two paths land on the same total.'],
    checkpoint: { question: 'Why does this avoid exploring every sign combination?', choices: ['Many combinations reach the same running total', 'Signs cancel out', 'The input is sorted'], answer: 0 },
  },
  {
    slug: 'interleaving-string',
    steps: sharedSteps('The two source strings must keep their own order, so the only decision at each step is which string supplies the next character. A cell in a two-dimensional table asks whether a given prefix of each can build the matching prefix of the target.', 'Moving down consumes a character of the first string, moving right consumes one from the second. A cell is reachable if the incoming move matches the corresponding character of the target.'),
    hints: ['Reject immediately when the lengths do not add up.', 'A cell is true if an adjacent true cell matches the needed character.', 'Only the previous row is required.'],
    checkpoint: { question: 'What do the two axes of the table represent?', choices: ['Characters and positions', 'How much of each source string has been consumed', 'Matches and mismatches'], answer: 1 },
  },
  {
    slug: 'longest-increasing-path-in-a-matrix',
    steps: sharedSteps('Because every step must strictly increase, no path can return to a cell, so the implied graph has no cycles. That makes plain memoisation safe: the answer for a cell never depends on itself.', 'Each cell caches the longest increasing path starting there. A cell asks its four neighbours, uses only the strictly larger ones, and stores one plus the best answer received.'),
    hints: ['Memoise per cell, keyed by position.', 'Only move to strictly larger neighbours.', 'The overall answer is the best starting cell.'],
    checkpoint: { question: 'Why is a visited set unnecessary here?', choices: ['The matrix is small', 'Strict increase makes revisiting a cell impossible', 'Memoisation replaces it'], answer: 1 },
  },
  {
    slug: 'distinct-subsequences',
    steps: sharedSteps('When the current characters agree you have a genuine choice: use this character to satisfy the target, or ignore it and look for a later match. Those two counts add, which is what makes the answer a count rather than a yes or no.', 'A table over prefixes of both strings. A matching pair adds the diagonal count to the count directly above; a mismatch inherits only the value above.'),
    hints: ['The empty target has exactly one match.', 'On a match, add the count that used this character.', 'Iterate the target backwards when compressed to one row.'],
    checkpoint: { question: 'Why do the two options add on a match?', choices: ['They are mutually exclusive ways to form a subsequence', 'The counts are equal', 'Addition is cheaper'], answer: 0 },
  },
  {
    slug: 'edit-distance',
    steps: sharedSteps('Turning one string into another uses three operations, and each corresponds to a neighbouring cell: replace comes from the diagonal, delete from above, insert from the left. When the characters already match, the diagonal is inherited free.', 'A grid whose borders count the cost of building from nothing. Every interior cell takes the cheapest of its three neighbours plus one, unless the characters agree.'),
    hints: ['Row zero and column zero are the lengths themselves.', 'Equal characters copy the diagonal with no cost.', 'Otherwise add one to the cheapest of three neighbours.'],
    checkpoint: { question: 'Which neighbour corresponds to replacing a character?', choices: ['Above', 'Diagonal', 'Left'], answer: 1 },
  },
  {
    slug: 'burst-balloons',
    steps: sharedSteps('Deciding which balloon to burst first is hard because it changes everyone neighbours. Deciding which one bursts last is easy: at that moment its neighbours are exactly the range boundaries, which never move.', 'Work over ranges rather than positions. For a range, try each balloon as the final burst; the two sides are then independent subproblems already solved for shorter ranges.'),
    hints: ['Pad the array with ones at both ends.', 'Iterate by range length, shortest first.', 'The chosen balloon neighbours are the range boundaries.'],
    checkpoint: { question: 'Why choose the last balloon to burst rather than the first?', choices: ['It is easier to find', 'Its neighbours are fixed, so the subproblems stay independent', 'Bursting order is reversible'], answer: 1 },
  },
  {
    slug: 'regular-expression-matching',
    steps: sharedSteps('The star is what makes this more than a scan: it can stand for nothing at all, or consume one character and remain available. Handling both branches, and letting the empty-pattern row account for erased stars, covers every case.', 'A grid over text and pattern prefixes. A star cell looks two columns back for the zero-occurrence case, and one row up for the consume-one case.'),
    hints: ['Seed the first row for patterns that can match empty.', 'A star with zero occurrences skips its pair.', 'A star consuming a character keeps the same pattern position.'],
    checkpoint: { question: 'Why does a star look two columns back?', choices: ['To skip the character it applies to as well as itself', 'Stars are two characters wide', 'To reach the previous row'], answer: 0 },
  },
  {
    slug: 'jump-game',
    steps: sharedSteps('You never need to know which jumps were taken, only how far it is possible to get. Sweeping left to right and keeping the furthest reachable index makes the answer obvious: if you ever stand beyond that reach, there is a gap.', 'A single marker for the furthest reachable index creeps along. Each position extends it, unless the position itself lies beyond the marker, in which case the walk is already blocked.'),
    hints: ['Track the furthest index reachable so far.', 'Fail as soon as the current index passes it.', 'The last index does not need to extend anything.'],
    checkpoint: { question: 'What proves the end is unreachable?', choices: ['A zero in the array', 'Reaching an index beyond the furthest reachable value', 'The array is too long'], answer: 1 },
  },
  {
    slug: 'jump-game-ii',
    steps: sharedSteps('Every jump defines a band of indices reachable with that many jumps, and the next band ends at the furthest anything in the current band can reach. Counting jumps is therefore counting bands, which is a breadth-first search without a queue.', 'The array splits into stripes. While inside a stripe you only extend the next boundary; arriving at the boundary spends a jump and opens the next stripe.'),
    hints: ['Track the end of the current jump range and the furthest reach.', 'Increment the count when the index meets the current end.', 'Stop before the last index so a final unnecessary jump is not counted.'],
    checkpoint: { question: 'When is the jump count incremented?', choices: ['On every index', 'When the scan reaches the end of the current reachable band', 'When the reach increases'], answer: 1 },
  },
  {
    slug: 'gas-station',
    steps: sharedSteps('If the total gas covers the total cost, some starting point works. Any prefix that runs the tank negative rules out every station inside it as a start, so the next station after the failure is the only remaining candidate.', 'One pass accumulating the running surplus. Whenever it dips below zero the candidate start jumps past that point and the tank resets, while a separate total decides feasibility overall.'),
    hints: ['Track the overall surplus and a running tank separately.', 'Reset the tank and move the start when the tank goes negative.', 'Feasibility depends only on the total, not the order.'],
    checkpoint: { question: 'Why can every station in a failing prefix be ruled out?', choices: ['They all have too little gas', 'Starting later in that prefix would be even worse', 'They are visited twice'], answer: 1 },
  },
  {
    slug: 'hand-of-straights',
    steps: sharedSteps('The smallest card left must begin a group, because nothing smaller remains to precede it. That removes all choice from the problem and turns it into a check that the next groupSize consecutive cards exist in sufficient quantity.', 'Counts per value, visited in ascending order. Each value with a remaining count demands that many copies of the following consecutive values, which are subtracted immediately.'),
    hints: ['The total must divide evenly by the group size.', 'Process values in ascending order.', 'Subtract the needed count from each of the next consecutive values.'],
    checkpoint: { question: 'Why must the smallest remaining card start a group?', choices: ['It is the most common', 'Nothing smaller exists to sit before it', 'Groups are sorted'], answer: 1 },
  },
  {
    slug: 'merge-triplets-to-form-target-triplet',
    steps: sharedSteps('Merging takes the element-wise maximum, which can never be undone. A triplet exceeding the target in any position would poison the result forever, so only triplets that fit everywhere are usable, and among those you just need each target value covered.', 'Filter out any triplet that overshoots. Among the rest, mark which positions already reach the target exactly. All three marked means the merge succeeds.'),
    hints: ['Discard a triplet if any element exceeds the target.', 'Among the survivors, note positions equal to the target.', 'Success requires all three positions covered.'],
    checkpoint: { question: 'Why is a triplet exceeding the target in one position unusable?', choices: ['It is too large overall', 'The maximum is permanent, so that position can never come back down', 'It duplicates another triplet'], answer: 1 },
  },
  {
    slug: 'partition-labels',
    steps: sharedSteps('A part cannot close while any letter inside it appears again later. Recording the last occurrence of every letter turns each part into a range that keeps extending until the scan catches up with the furthest such occurrence.', 'A moving boundary. Each character pushes the boundary out to its own last occurrence, and when the scan position equals the boundary the part is complete.'),
    hints: ['Precompute the last index of each character.', 'Extend the boundary to the maximum last index seen.', 'Close the part when the index equals the boundary.'],
    checkpoint: { question: 'When can a part be closed?', choices: ['At a repeated character', 'When the scan reaches the furthest last occurrence in the part', 'After a fixed length'], answer: 1 },
  },
  {
    slug: 'valid-parenthesis-string',
    steps: sharedSteps('A star makes the open count ambiguous, so track a range instead of a number: the fewest and most open brackets still possible. The string is valid if that range can end at zero without the maximum ever going negative.', 'Two counters widen apart at a star and move together otherwise. The low end is clamped at zero, since you cannot owe a negative number of closers.'),
    hints: ['A star decreases the low bound and increases the high bound.', 'Fail immediately if the high bound goes negative.', 'Clamp the low bound at zero as you go.'],
    checkpoint: { question: 'Why clamp the low bound at zero?', choices: ['To avoid overflow', 'A negative count is impossible, and the stars could have been closers', 'It makes the loop end sooner'], answer: 1 },
  },
  {
    slug: 'insert-interval',
    steps: sharedSteps('Because the existing intervals are sorted and disjoint, the new one interacts with a single contiguous run of them. Everything strictly before is untouched, everything overlapping merges into one, and everything after is untouched.', 'Three phases in one pass: copy intervals ending before the new one starts, absorb every interval that overlaps by widening the bounds, then copy the rest.'),
    hints: ['Copy while the current end is below the new start.', 'Widen the new interval while the current start is not past its end.', 'Push the merged interval before copying the tail.'],
    checkpoint: { question: 'Why do the overlapping intervals form one contiguous run?', choices: ['They are sorted and non-overlapping to begin with', 'They all contain the new start', 'There are at most two'], answer: 0 },
  },
  {
    slug: 'meeting-rooms',
    steps: sharedSteps('Once sorted by start time, a conflict can only involve consecutive meetings, because anything later starts even later. So one pass comparing each meeting start with the previous end settles it.', 'Meetings laid on a timeline in start order. Only adjacent pairs need checking; a start earlier than the previous end is an overlap.'),
    hints: ['Sort by start time.', 'Compare each start with the previous end.', 'Touching endpoints are not an overlap.'],
    checkpoint: { question: 'Why is comparing adjacent pairs sufficient?', choices: ['Meetings are short', 'Anything further ahead starts even later, so it cannot conflict first', 'Sorting removes overlaps'], answer: 1 },
  },
  {
    slug: 'meeting-rooms-ii',
    steps: sharedSteps('The number of rooms needed is the largest number of meetings running at once. Separating the starts and the ends into two sorted lists lets you sweep the timeline and watch that count rise and fall.', 'Two ordered sequences of events. Each start raises the occupancy, each end that precedes it lowers it first. The peak occupancy is the answer.'),
    hints: ['Sort starts and ends independently.', 'Release rooms whose end is at or before the current start.', 'Track the running count and its maximum.'],
    checkpoint: { question: 'Why can the starts and ends be sorted separately?', choices: ['Only the count of concurrent meetings matters, not which ones', 'They are already sorted', 'Meetings never overlap'], answer: 0 },
  },
  {
    slug: 'minimum-interval-to-include-each-query',
    steps: sharedSteps('Answering each query independently rescans the intervals. Sorting the queries instead lets intervals be added once, in order, and a heap keyed by size offers the smallest live interval, with expired ones discarded lazily.', 'Queries advance along the timeline. Intervals that have started are pushed by size; before answering, any whose end has passed are popped off the top.'),
    hints: ['Sort queries but remember their original positions.', 'Push intervals whose start is not past the query.', 'Pop from the top while the smallest interval has already ended.'],
    checkpoint: { question: 'Why must the original query order be remembered?', choices: ['Queries may repeat', 'The answers must be returned in the input order', 'Sorting is unstable'], answer: 1 },
  },
  {
    slug: 'spiral-matrix',
    steps: sharedSteps('A spiral is four directed passes that repeat while the remaining rectangle is non-empty. Tracking the four boundaries and shrinking each after its pass keeps the traversal from revisiting anything.', 'Top row left to right, right column down, bottom row back, left column up. Each pass retires its boundary, closing the rectangle inward.'),
    hints: ['Keep top, bottom, left and right boundaries.', 'Shrink the relevant boundary after each pass.', 'Re-check the boundaries before the bottom and left passes.'],
    checkpoint: { question: 'Why re-check the boundaries mid-loop?', choices: ['A single remaining row or column would otherwise be traversed twice', 'Boundaries can move backwards', 'The matrix may be empty'], answer: 0 },
  },
  {
    slug: 'set-matrix-zeroes',
    steps: sharedSteps('Marking rows and columns needs somewhere to write, and constant space means it has to be inside the matrix. The first row and column can serve as that notepad, provided their own original state is remembered separately.', 'A first pass writes flags into the borders. A second pass reads them, working backwards so a border flag is not overwritten before it has been used.'),
    hints: ['Use row 0 and column 0 as the flag storage.', 'Remember separately whether column 0 originally held a zero.', 'Apply the flags in reverse so they survive until read.'],
    checkpoint: { question: 'Why apply the flags working backwards?', choices: ['It is faster', 'So the border flags are not overwritten before being read', 'Forward order skips cells'], answer: 1 },
  },
  {
    slug: 'happy-number',
    steps: sharedSteps('Repeatedly summing squared digits either reaches one or repeats forever, and there is no third outcome because the values stay bounded. So the task is really loop detection on a sequence.', 'Two walkers step through the sequence at different speeds. Reaching one means happy; meeting anywhere else means a cycle that will never reach one.'),
    hints: ['Write a helper that produces the next value.', 'Advance one pointer once and the other twice.', 'Stop when the fast pointer hits one or the two meet.'],
    checkpoint: { question: 'Why must the sequence either reach one or cycle?', choices: ['Digits are finite', 'The values stay bounded, so some value must repeat', 'Squares always shrink'], answer: 1 },
  },
  {
    slug: 'plus-one',
    steps: sharedSteps('Adding one only propagates while it meets nines, because any smaller digit absorbs the carry and the rest of the number is unchanged. Only an entire row of nines grows the number by a digit.', 'Walk from the last digit backwards. The first digit below nine is incremented and the work stops; every nine passed becomes zero.'),
    hints: ['Iterate from the end.', 'A digit below nine can be incremented and returned immediately.', 'Only all-nines needs a new leading digit.'],
    checkpoint: { question: 'Why can the loop return as soon as a digit below nine is found?', choices: ['The rest of the digits are unaffected', 'The number is sorted', 'Nines cannot be incremented'], answer: 0 },
  },
  {
    slug: 'powx-n',
    steps: sharedSteps('Squaring the base halves the exponent, so the work grows with the number of bits rather than the value. A negative exponent is handled once at the start by inverting the base.', 'The exponent shrinks by half each round. Whenever it is odd, the current base is folded into the result; either way the base squares and the exponent halves again.'),
    hints: ['Invert the base and negate a negative exponent first.', 'Multiply into the result only on an odd exponent.', 'Square the base every round.'],
    checkpoint: { question: 'Why multiply into the result only when the exponent is odd?', choices: ['Even exponents are skipped', 'An odd exponent leaves one factor that halving cannot represent', 'It avoids overflow'], answer: 1 },
  },
  {
    slug: 'multiply-strings',
    steps: sharedSteps('Long multiplication has a positional identity: the product of digit i and digit j always lands at positions i + j and i + j + 1. Accumulating into a result array by that rule avoids any intermediate number conversion.', 'A grid of digit products, each dropped into its two slots. A carry ripples one position left as each slot is normalised.'),
    hints: ['Allocate a result of length m + n.', 'Add the product into position i + j + 1 and carry into i + j.', 'Strip leading zeros at the end.'],
    checkpoint: { question: 'Why does a digit product occupy two positions?', choices: ['Digits are two bits wide', 'A product can reach 81, so it needs a tens place', 'The result is reversed'], answer: 1 },
  },
  {
    slug: 'detect-squares',
    steps: sharedSteps('An axis-aligned square is determined by any two opposite corners, so fix the query point and look for a stored point diagonal to it. The remaining two corners are then at known coordinates, and the count multiplies.', 'From the query point, each candidate diagonal must sit at equal horizontal and vertical distance and share neither row nor column. The two other corners are then fully determined, and their stored counts multiply.'),
    hints: ['A diagonal has equal absolute x and y differences, both non-zero.', 'The other corners are at (px, y) and (x, py).', 'Multiply the three counts together.'],
    checkpoint: { question: 'Why multiply the counts rather than add them?', choices: ['Each combination of duplicate points forms a distinct square', 'Counts are always one', 'Addition would double count'], answer: 0 },
  },
  {
    slug: 'number-of-1-bits',
    steps: sharedSteps('Subtracting one flips the lowest set bit to zero and turns everything below it to ones, so anding the two clears exactly that bit. Repeating until zero runs once per set bit rather than once per bit.', 'Each round removes the rightmost one from the number. The loop length is the answer, so a sparse number finishes quickly.'),
    hints: ['n & (n - 1) clears the lowest set bit.', 'Count the iterations until the value is zero.', 'No shifting through all 32 positions is needed.'],
    checkpoint: { question: 'Why does n & (n - 1) clear only the lowest set bit?', choices: ['Subtraction borrows through the trailing zeros, flipping exactly that bit', 'It clears all bits', 'It shifts the number right'], answer: 0 },
  },
  {
    slug: 'counting-bits',
    steps: sharedSteps('Dropping the last bit of a number gives a smaller number whose answer is already known. So the count for n is the count for n shifted right, plus whether the bit just dropped was a one.', 'A table filled left to right, each entry pointing back to the entry at half its index. One lookup and one addition per number.'),
    hints: ['Right shifting by one is integer division by two.', 'The lowest bit is n & 1.', 'Every dependency has a smaller index, so one pass suffices.'],
    checkpoint: { question: 'Why is a single forward pass enough?', choices: ['The numbers are sorted', 'Each answer depends only on a smaller index already computed', 'Bits never repeat'], answer: 1 },
  },
  {
    slug: 'reverse-bits',
    steps: sharedSteps('Reversal moves the lowest bit to the highest position, so build the answer by shifting it left while shifting the input right. Exactly 32 rounds handles a fixed-width integer regardless of leading zeros.', 'Two registers moving in opposite directions: the input surrenders its lowest bit, the result accepts it as its new lowest before shifting again.'),
    hints: ['Shift the result left, then or in the input lowest bit.', 'Shift the input right with the unsigned operator.', 'Always run exactly 32 rounds.'],
    checkpoint: { question: 'Why run a fixed 32 rounds rather than until the input is zero?', choices: ['Leading zeros are significant in a fixed-width reversal', 'It is faster', 'The input may be negative'], answer: 0 },
  },
  {
    slug: 'missing-number',
    steps: sharedSteps('Every index and every value pairs up except the missing one. XORing all indices together with all values cancels those pairs, leaving the unmatched number behind.', 'Two interleaved sequences fold into one accumulator. Identical numbers annihilate wherever they appear, so only the gap survives.'),
    hints: ['Seed the accumulator with the array length.', 'XOR both the index and the value at each step.', 'Summation also works but can overflow for large inputs.'],
    checkpoint: { question: 'Why seed the accumulator with the array length?', choices: ['It is the largest value', 'The loop covers indices 0 to n-1, so n needs including', 'It prevents overflow'], answer: 1 },
  },
  {
    slug: 'sum-of-two-integers',
    steps: sharedSteps('Addition splits into two parts: the bits that combine without carrying, which is XOR, and the bits that generate a carry, which is AND shifted left. Feeding the carry back in repeatedly finishes the sum.', 'Each round produces a partial sum and a carry. The carry moves one position left and is added again, until there is nothing left to carry.'),
    hints: ['XOR gives the sum ignoring carries.', 'AND then shift left gives the carry.', 'Repeat until the carry is zero.'],
    checkpoint: { question: 'Why is the carry shifted left before the next round?', choices: ['A carry applies to the next higher bit', 'To make it positive', 'To halve it'], answer: 0 },
  },
  {
    slug: 'reverse-integer',
    steps: sharedSteps('The reversal itself is a digit loop, but the result may not fit in 32 bits. Checking before appending each digit, rather than after, keeps the value from ever exceeding the range.', 'Digits are peeled from the right and pushed onto a growing result. Before each push the remaining headroom is compared against the limit.'),
    hints: ['Peel digits with modulo and integer division.', 'Test against the limit before multiplying by ten.', 'Handle the sign separately from the magnitude.'],
    checkpoint: { question: 'Why check for overflow before appending the digit?', choices: ['Afterwards the value may already be unrepresentable', 'It is faster', 'Digits are unsigned'], answer: 0 },
  },
];

const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));

/**
 * The full library: every NeetCode 150 problem, with a hand-written lesson
 * layered on top wherever one exists.
 */
export const problems: Problem[] = neetcode150.map((entry) => {
  const lesson = lessonBySlug.get(entry.slug);
  if (!lesson) return { ...entry, status: 'not-started', lessonReady: false };
  return { ...entry, ...lesson, status: 'not-started', lessonReady: true };
});

export { patterns };

/**
 * Per-pattern teaching material for the concept and visual steps.
 *
 * These steps used to hardcode sliding-window advice and a moving-window
 * diagram, which is actively misleading on a binary search or tree lesson.
 */
export type PatternTeaching = {
  /** How to recognise the pattern in a problem statement. */
  tell: string;
  visualTitle: string;
  cells: string[];
  /** Indices in the current working set. */
  active: number[];
  /** Indices the algorithm is deciding about right now. */
  focus: number[];
  axis: string;
  closing: string;
};

const genericTeaching: PatternTeaching = {
  tell: 'Name the state the algorithm carries and the fact it keeps true; the code follows from those two sentences.',
  visualTitle: 'State in motion',
  cells: ['2', '7', '1', '8', '2', '8'],
  active: [0, 1, 2],
  focus: [3],
  axis: 'start ─────────────── end',
  closing: 'At each move the structure holds just enough history to make the next decision. That is the pattern’s leverage.',
};

export const patternTeaching: Record<string, PatternTeaching> = {
  'Sliding window': {
    tell: 'When a problem asks for the “longest”, “smallest” or “at most” valid range, ask whether a moving window can keep that condition true.',
    visualTitle: 'Window in motion',
    cells: ['a', 'b', 'c', 'a', 'd', 'e'],
    active: [1, 2, 3],
    focus: [4],
    axis: 'left edge ─────────────── right edge',
    closing: 'Both edges only ever move forward, so each element is handled a constant number of times.',
  },
  'Two pointers': {
    tell: 'When the input is sorted, or the answer pairs a value from each end, two walking pointers replace a nested loop.',
    visualTitle: 'Closing in from both ends',
    cells: ['1', '3', '4', '7', '9', '12'],
    active: [1, 2, 3, 4],
    focus: [0, 5],
    axis: 'left →                    ← right',
    closing: 'Every comparison rules out a whole set of pairs, which is what turns O(n²) into O(n).',
  },
  'Binary search': {
    tell: 'When a yes/no test flips exactly once across the range, you can search the answer itself, not just a sorted array.',
    visualTitle: 'Halving the range',
    cells: ['no', 'no', 'no', 'yes', 'yes', 'yes'],
    active: [3, 4, 5],
    focus: [2, 3],
    axis: 'low ────── mid ────── high',
    closing: 'Each step throws away half the candidates, so the work is logarithmic in the range, not the data.',
  },
  Intervals: {
    tell: 'When the input is ranges with a start and an end, sorting turns overlap into a question about neighbours only.',
    visualTitle: 'Merging a timeline',
    cells: ['1–3', '2–6', '8–10', '15–18'],
    active: [0, 1],
    focus: [2],
    axis: 'sorted by start ──────────→',
    closing: 'The last interval stays editable until a gap proves it finished.',
  },
  Stack: {
    tell: 'When each element waits for a later one — the next greater, the matching bracket — a stack holds the unresolved work.',
    visualTitle: 'Unresolved work, newest on top',
    cells: ['73', '74', '75', '71'],
    active: [3],
    focus: [2],
    axis: 'bottom ──────────────── top',
    closing: 'Each item is pushed and popped once, replacing repeated backward scans with linear work.',
  },
  'Linked list': {
    tell: 'When the task is about the structure — reversing, reordering, detecting a loop — work on pointers rather than values.',
    visualTitle: 'Rewiring one link at a time',
    cells: ['1', '2', '3', '4', '∅'],
    active: [0, 1],
    focus: [2],
    axis: 'prev ── curr ── next',
    closing: 'Save the next pointer before you overwrite a link, or the rest of the list becomes unreachable.',
  },
  Trees: {
    tell: 'Ask whether the answer depends on depth or on level: depth suggests recursion, level suggests a queue.',
    visualTitle: 'Level by level',
    cells: ['3', '9', '20', '15', '7'],
    active: [1, 2],
    focus: [3, 4],
    axis: 'root ── level 1 ── level 2',
    closing: 'Capture the frontier size before each pass and the level boundary takes care of itself.',
  },
  Graphs: {
    tell: 'When the data is cells or nodes joined by edges, the question is usually reachability, components or shortest distance.',
    visualTitle: 'Exploring a frontier',
    cells: ['●', '●', '○', '●', '○', '○'],
    active: [0, 1, 3],
    focus: [2],
    axis: 'visited ──────── frontier ──────── unseen',
    closing: 'Mark a node the moment it enters the frontier, and a cycle can never enqueue it twice.',
  },
  Backtracking: {
    tell: 'When the answer is every combination, permutation or arrangement, build it by choosing, recursing and undoing.',
    visualTitle: 'A search tree with pruning',
    cells: ['[]', '[1]', '[1,2]', '✗', '[1,3]'],
    active: [0, 1, 2],
    focus: [3],
    axis: 'choose ── recurse ── undo',
    closing: 'The search is exponential, so every branch you can rule out early is the real optimisation.',
  },
  Heap: {
    tell: 'When only the best k items matter, a heap of size k keeps the cost tied to k instead of the whole input.',
    visualTitle: 'A small leaderboard',
    cells: ['5', '8', '12', '↓3'],
    active: [0, 1, 2],
    focus: [3],
    axis: 'root = weakest kept ──────→',
    closing: 'The root is the first candidate to drop, which is what makes each update logarithmic in k.',
  },
  'Arrays & hashing': {
    tell: 'When a nested loop keeps asking the same question about earlier elements, a hash map can answer it in one pass.',
    visualTitle: 'Memory of everything behind you',
    cells: ['2', '7', '11', '15'],
    active: [0, 1],
    focus: [2],
    axis: 'seen so far ──────→ current',
    closing: 'The map grows with the input, which is the space you spend to buy the time.',
  },
  Tries: {
    tell: 'When the question is about prefixes rather than whole words, share the prefixes instead of storing each word separately.',
    visualTitle: 'Words sharing a spine',
    cells: ['c', 'a', 'r', '•', 't'],
    active: [0, 1, 2],
    focus: [3],
    axis: 'root ──────→ end of word',
    closing: 'A lookup costs the length of the word, not the size of the dictionary.',
  },
  'Advanced graphs': {
    tell: 'Once edges carry different weights, plain BFS stops being correct — order the frontier by cost instead.',
    visualTitle: 'Cheapest frontier first',
    cells: ['0', '1', '3', '∞', '∞'],
    active: [0, 1],
    focus: [2],
    axis: 'settled ──── frontier ──── unreached',
    closing: 'A node popped as cheapest can never be improved later, so its distance is final.',
  },
  '2-D dynamic programming': {
    tell: 'When the state needs two indices — two strings, or a grid position — the table gains a second axis.',
    visualTitle: 'A grid filled in order',
    cells: ['1', '1', '1', '1', '2', '3'],
    active: [0, 1, 2, 3, 4],
    focus: [5],
    axis: 'from above + from the left',
    closing: 'Each cell reads only finished neighbours, so one row of memory is usually enough.',
  },
  Greedy: {
    tell: 'When you can argue that a locally best choice never rules out an optimal answer, you can commit to it and never look back.',
    visualTitle: 'Commit and move on',
    cells: ['-2', '1', '-3', '4', '-1', '2'],
    active: [3],
    focus: [4, 5],
    axis: 'restart ──── carry ──── best so far',
    closing: 'The whole method rests on the exchange argument; without it, greedy is just a guess.',
  },
  'Math & geometry': {
    tell: 'When the task is a transform on a grid or a number, look for the index identity rather than simulating the motion.',
    visualTitle: 'Where each element must land',
    cells: ['1', '2', '3', '4'],
    active: [0, 1],
    focus: [2, 3],
    axis: 'transpose ──── then reverse',
    closing: 'Composing two simple passes usually removes the temporary copy entirely.',
  },
  'Bit manipulation': {
    tell: 'When values pair off, or the answer is about individual bits, XOR and masks do the bookkeeping for free.',
    visualTitle: 'Pairs cancelling',
    cells: ['4', '1', '2', '1', '2'],
    active: [1, 2, 3, 4],
    focus: [0],
    axis: 'x ^ x = 0 ──── x ^ 0 = x',
    closing: 'Constant space and a single pass, at the cost of needing a comment to stay readable.',
  },
  'Dynamic programming': {
    tell: 'When the same smaller question keeps reappearing, name the state and store its answer once.',
    visualTitle: 'A table filled in order',
    cells: ['0', '1', '1', '2', '3', '?'],
    active: [0, 1, 2, 3, 4],
    focus: [5],
    axis: 'dp[0] ──────────────→ dp[n]',
    closing: 'Each cell is computed from cells already finished, so the recursion collapses into a single sweep.',
  },
};

export function teachingFor(pattern: string): PatternTeaching {
  return patternTeaching[pattern] ?? genericTeaching;
}
