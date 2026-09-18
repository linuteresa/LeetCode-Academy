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
