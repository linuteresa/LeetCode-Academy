/**
 * The practice session is a state machine, so it is worth testing without a
 * browser: a wrong answer must not advance the conversation, a right one must,
 * and the run must end with LeetCode reachable regardless of how it went.
 */
import { problems } from '@/data/problems';
import { complexityChoices, mentionsSignal, scriptedInterviewer, type Session } from './interview';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
};

const problem = problems.find((p) => p.slug === 'two-sum')!;
const correctIndex = (s: Session) => s.choices.findIndex((c) => c.correct);
const wrongIndex = (s: Session) => s.choices.findIndex((c) => !c.correct);

// Opening turn.
let s = scriptedInterviewer.start(problem);
check('opens with the statement and a prompt', s.transcript.length, 2);
check('opens awaiting free text', s.awaiting, 'text');
check('starts uncleared', s.cleared, false);
check('opening includes the problem statement', s.transcript[0].text.includes(problem.prompt), true);

// The think-aloud is recorded and moves to the first check.
s = scriptedInterviewer.reply(problem, s, { text: 'I would use a hash map of seen values' });
check('candidate turn is recorded', s.transcript.some((t) => t.from === 'candidate'), true);
check('moves to a choice question', s.awaiting, 'choice');
check('offers choices', s.choices.length > 1, true);

// A wrong answer must not advance the stage.
const stageBefore = s.stage;
const afterWrong = scriptedInterviewer.reply(problem, s, { choiceIndex: wrongIndex(s) });
check('a wrong answer holds the stage', afterWrong.stage, stageBefore);
check('a wrong answer still awaits a choice', afterWrong.awaiting, 'choice');
check('a wrong answer counts a misstep', afterWrong.missteps, 1);
check('a wrong answer does not clear the session', afterWrong.cleared, false);

// Walking the whole session with correct answers must terminate.
let turns = 0;
while (s.awaiting !== 'done' && turns < 20) {
  s = scriptedInterviewer.reply(problem, s, { choiceIndex: correctIndex(s) });
  turns++;
}
check('a correct run reaches the end', s.awaiting, 'done');
check('a correct run is marked complete', s.cleared, true);
check('no choices are pending at the end', s.choices.length, 0);
check('the run takes a bounded number of turns', turns <= 5, true);

// Recovering after a misstep still completes.
let r = scriptedInterviewer.start(problem);
r = scriptedInterviewer.reply(problem, r, { text: 'not sure yet' });
r = scriptedInterviewer.reply(problem, r, { choiceIndex: wrongIndex(r) });
let guard = 0;
while (r.awaiting !== 'done' && guard < 20) {
  r = scriptedInterviewer.reply(problem, r, { choiceIndex: correctIndex(r) });
  guard++;
}
check('a session with a misstep still completes', r.cleared, true);
check('the misstep is remembered', r.missteps, 1);

// Complexity options must include the real answer exactly once.
const options = complexityChoices(problem);
check('complexity offers three options', options.length, 3);
check('exactly one is correct', options.filter((c) => c.correct).length, 1);
check('the correct option is the real complexity', options.find((c) => c.correct)!.label.includes(problem.complexity.time), true);

// The opening nudge should notice when the answer engaged with the problem.
check('recognises a relevant answer', mentionsSignal(problem, 'a hash map would work'), true);
check('does not pretend to understand noise', mentionsSignal(problem, 'no idea'), false);

// Every problem must be able to run a session to completion.
const stuck: string[] = [];
for (const p of problems) {
  let session = scriptedInterviewer.start(p);
  session = scriptedInterviewer.reply(p, session, { text: 'my first thought' });
  let steps = 0;
  while (session.awaiting !== 'done' && steps < 20) {
    const i = session.choices.findIndex((c) => c.correct);
    if (i < 0) break;
    session = scriptedInterviewer.reply(p, session, { choiceIndex: i });
    steps++;
  }
  if (!session.cleared) stuck.push(p.slug);
}
check('every problem can run a full session', stuck, []);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
