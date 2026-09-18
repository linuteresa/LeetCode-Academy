/**
 * The practice session is a state machine, so it is worth testing without a
 * browser: a wrong answer must not advance the conversation, a right one must,
 * and the run must end with LeetCode reachable regardless of how it went.
 */
import { problems } from '@/data/problems';
import { complexityChoices, createRemoteInterviewer, isRemoteReply, MAX_MESSAGE_CHARS, MAX_TURNS, mentionsSignal, scriptedInterviewer, type Session } from './interview';

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
s = await scriptedInterviewer.reply(problem, s, { text: 'I would use a hash map of seen values' });
check('candidate turn is recorded', s.transcript.some((t) => t.from === 'candidate'), true);
check('moves to a choice question', s.awaiting, 'choice');
check('offers choices', s.choices.length > 1, true);

// A wrong answer must not advance the stage.
const stageBefore = s.stage;
const afterWrong = await scriptedInterviewer.reply(problem, s, { choiceIndex: wrongIndex(s) });
check('a wrong answer holds the stage', afterWrong.stage, stageBefore);
check('a wrong answer still awaits a choice', afterWrong.awaiting, 'choice');
check('a wrong answer counts a misstep', afterWrong.missteps, 1);
check('a wrong answer does not clear the session', afterWrong.cleared, false);

// Walking the whole session with correct answers must terminate.
let turns = 0;
while (s.awaiting !== 'done' && turns < 20) {
  s = await scriptedInterviewer.reply(problem, s, { choiceIndex: correctIndex(s) });
  turns++;
}
check('a correct run reaches the end', s.awaiting, 'done');
check('a correct run is marked complete', s.cleared, true);
check('no choices are pending at the end', s.choices.length, 0);
check('the run takes a bounded number of turns', turns <= 5, true);

// Recovering after a misstep still completes.
let r = scriptedInterviewer.start(problem);
r = await scriptedInterviewer.reply(problem, r, { text: 'not sure yet' });
r = await scriptedInterviewer.reply(problem, r, { choiceIndex: wrongIndex(r) });
let guard = 0;
while (r.awaiting !== 'done' && guard < 20) {
  r = await scriptedInterviewer.reply(problem, r, { choiceIndex: correctIndex(r) });
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
  session = await scriptedInterviewer.reply(p, session, { text: 'my first thought' });
  let steps = 0;
  while (session.awaiting !== 'done' && steps < 20) {
    const i = session.choices.findIndex((c) => c.correct);
    if (i < 0) break;
    session = await scriptedInterviewer.reply(p, session, { choiceIndex: i });
    steps++;
  }
  if (!session.cleared) stuck.push(p.slug);
}
check('every problem can run a full session', stuck, []);

// --- Hosted interviewer -------------------------------------------------
// It is the part that cannot be clicked through locally, so the failure modes
// that matter are the ones exercised here.

const stubFetch = (impl: typeof fetch) => {
  (globalThis as { fetch: typeof fetch }).fetch = impl;
};
const realFetch = globalThis.fetch;

// A signed-out visitor must never reach the model.
const signedOut = createRemoteInterviewer('https://example.test/interview', async () => null);
let calls = 0;
stubFetch((async () => { calls++; return new Response('{}'); }) as typeof fetch);
let rs = signedOut.start(problem);
rs = await signedOut.reply(problem, rs, { text: 'hello' });
check('a signed-out session does not call the endpoint', calls, 0);
check('a signed-out session says why', rs.transcript.at(-1)!.text.toLowerCase().includes('sign in'), true);
check('a signed-out session keeps going', rs.awaiting, 'text');

// A healthy reply advances the conversation.
const signedIn = createRemoteInterviewer('https://example.test/interview', async () => 'token');
let sentAuth: string | null = null;
let sentBody: string | null = null;
stubFetch((async (_url, init) => {
  const headers = (init as RequestInit).headers as Record<string, string>;
  sentAuth = headers.authorization;
  sentBody = String((init as RequestInit).body);
  return new Response(JSON.stringify({ reply: 'What is your invariant?', done: false }), { status: 200 });
}) as typeof fetch);
let live = signedIn.start(problem);
live = await signedIn.reply(problem, live, { text: 'hash map' });
check('the session token is sent', sentAuth, 'Bearer token');
check('the model reply is appended', live.transcript.at(-1)!.text, 'What is your invariant?');
check('the conversation continues', live.awaiting, 'text');
check('the intended complexity is sent for judging', String(sentBody).includes(problem.complexity.time), true);

// done:true ends the session.
stubFetch((async () => new Response(JSON.stringify({ reply: 'Good. Go write it.', done: true }), { status: 200 })) as typeof fetch);
live = await signedIn.reply(problem, live, { text: 'O(n) time, O(n) space' });
check('done ends the session', live.awaiting, 'done');
check('done marks it complete', live.cleared, true);

// A failing endpoint must not strand the candidate.
stubFetch((async () => new Response('nope', { status: 500 })) as typeof fetch);
let broken = signedIn.start(problem);
broken = await signedIn.reply(problem, broken, { text: 'hello' });
check('a 500 does not end the session', broken.awaiting, 'text');
check('a 500 is explained', broken.transcript.at(-1)!.text.toLowerCase().includes('could not reach'), true);

// A malformed body is treated as a failure, not trusted.
stubFetch((async () => new Response(JSON.stringify({ unexpected: true }), { status: 200 })) as typeof fetch);
let junk = signedIn.start(problem);
junk = await signedIn.reply(problem, junk, { text: 'hello' });
check('a malformed reply is rejected', junk.transcript.at(-1)!.text.toLowerCase().includes('could not reach'), true);

// Long answers are truncated before they are sent.
stubFetch((async (_url, init) => {
  sentBody = String((init as RequestInit).body);
  return new Response(JSON.stringify({ reply: 'ok' }), { status: 200 });
}) as typeof fetch);
let long = signedIn.start(problem);
long = await signedIn.reply(problem, long, { text: 'x'.repeat(MAX_MESSAGE_CHARS + 500) });
check('an over-long answer is truncated', JSON.parse(String(sentBody)).transcript.at(-1).text.length, MAX_MESSAGE_CHARS);

// A runaway conversation stops on its own.
let runaway = signedIn.start(problem);
runaway = { ...runaway, transcript: Array.from({ length: MAX_TURNS + 1 }, () => ({ from: 'candidate' as const, text: 'x' })) };
calls = 0;
stubFetch((async () => { calls++; return new Response(JSON.stringify({ reply: 'ok' }), { status: 200 }); }) as typeof fetch);
runaway = await signedIn.reply(problem, runaway, { text: 'and another thing' });
check('a runaway conversation stops calling out', calls, 0);
check('a runaway conversation ends', runaway.awaiting, 'done');

check('a reply shape is validated', isRemoteReply({ reply: 'hi' }), true);
check('a non-reply shape is rejected', isRemoteReply({ nope: 1 }), false);

globalThis.fetch = realFetch;

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
