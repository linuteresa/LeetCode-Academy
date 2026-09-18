import { intuitionChecksFor, type Problem } from '@/data/problems';

export type Speaker = 'interviewer' | 'candidate';

export type Turn = { from: Speaker; text: string };

export type Choice = { label: string; correct: boolean };

/** What the interviewer is waiting for before it will say anything else. */
export type Awaiting = 'text' | 'choice' | 'done';

export type Session = {
  slug: string;
  transcript: Turn[];
  awaiting: Awaiting;
  /** Present only while `awaiting` is 'choice'. */
  choices: Choice[];
  stage: number;
  /** Wrong answers so far; used for the closing remark, not to fail anyone. */
  missteps: number;
  /** True once the approach has been talked all the way through. Nothing is
   *  gated on it: LeetCode is always one click away. */
  cleared: boolean;
};

export type Answer = { text?: string; choiceIndex?: number };

/**
 * A source of interviewer turns.
 *
 * The scripted implementation below needs no network and no key, which is why
 * it ships first. A hosted model would implement this same shape -- a reply
 * function over the session so far -- so the panel does not need to change.
 */
export type Interviewer = {
  id: string;
  label: string;
  /** Whether replies are generated or drawn from the lesson's own material. */
  scripted: boolean;
  start(problem: Problem): Session;
  reply(problem: Problem, session: Session, answer: Answer): Session;
};

const say = (session: Session, text: string): Turn[] => [...session.transcript, { from: 'interviewer' as const, text }];

/** Complexity distractors, ordered so the plausible neighbours come first. */
const LADDER = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'];

export function complexityChoices(problem: Problem): Choice[] {
  const correct = `${problem.complexity.time} time, ${problem.complexity.space} space`;
  const others = LADDER.filter((t) => t !== problem.complexity.time)
    .slice(0, 2)
    .map((t) => `${t} time, ${problem.complexity.space} space`);

  const all = [{ label: correct, correct: true }, ...others.map((label) => ({ label, correct: false }))];
  // Deterministic order so the answer is not always first, without randomness
  // that would make the session impossible to test.
  const offset = problem.slug.length % all.length;
  return [...all.slice(offset), ...all.slice(0, offset)];
}

/** A light check that the opening answer engaged with the problem at all. */
export function mentionsSignal(problem: Problem, text: string): boolean {
  const haystack = text.toLowerCase();
  const signals = [...problem.tags, problem.pattern, ...problem.pattern.split(' ')]
    .map((s) => s.toLowerCase())
    .filter((s) => s.length > 3);
  return signals.some((s) => haystack.includes(s));
}

function checkTurn(problem: Problem, index: number): { text: string; choices: Choice[] } {
  const check = intuitionChecksFor(problem)[index];
  return {
    text: check.question,
    choices: check.choices.map((label, i) => ({ label, correct: i === check.answer })),
  };
}

export const scriptedInterviewer: Interviewer = {
  id: 'scripted',
  label: 'Practice interviewer',
  scripted: true,

  start(problem) {
    return {
      slug: problem.slug,
      transcript: [
        {
          from: 'interviewer',
          text: `Let's work through ${problem.title}. ${problem.prompt}`,
        },
        {
          from: 'interviewer',
          text: 'Before any code — what stands out about the input, and what are you being asked to optimise? Think out loud.',
        },
      ],
      awaiting: 'text',
      choices: [],
      stage: 0,
      missteps: 0,
      cleared: false,
    };
  },

  reply(problem, session, answer) {
    const checks = intuitionChecksFor(problem);
    const withCandidate: Session = answer.text
      ? { ...session, transcript: [...session.transcript, { from: 'candidate', text: answer.text }] }
      : answer.choiceIndex !== undefined
        ? {
            ...session,
            transcript: [
              ...session.transcript,
              { from: 'candidate', text: session.choices[answer.choiceIndex]?.label ?? '' },
            ],
          }
        : session;

    // Stage 0: the opening think-aloud. Nothing here is graded; the reply
    // acknowledges what was said and hands over the idea the lesson teaches.
    if (session.stage === 0) {
      const engaged = mentionsSignal(problem, answer.text ?? '');
      const concept = problem.steps?.find((s) => s.kind === 'concept')?.body ?? problem.summary;
      const opener = engaged
        ? 'Good — you are looking at the right part of the input.'
        : 'Fair start. Let me point at the part of the input that matters.';
      const first = checkTurn(problem, 0);
      return {
        ...withCandidate,
        transcript: [
          ...withCandidate.transcript,
          { from: 'interviewer', text: `${opener} ${concept}` },
          { from: 'interviewer', text: first.text },
        ],
        awaiting: 'choice',
        choices: first.choices,
        stage: 1,
      };
    }

    // Stages 1-3: the three intuition checks, answered by choice.
    if (session.stage >= 1 && session.stage <= checks.length) {
      const index = session.stage - 1;
      const chosen = session.choices[answer.choiceIndex ?? -1];
      if (!chosen?.correct) {
        return {
          ...withCandidate,
          transcript: [
            ...withCandidate.transcript,
            { from: 'interviewer', text: `Not quite. ${checks[index].explanation} Try that one again.` },
          ],
          awaiting: 'choice',
          missteps: session.missteps + 1,
        };
      }

      const next = session.stage;
      if (next < checks.length) {
        const turn = checkTurn(problem, next);
        return {
          ...withCandidate,
          transcript: [
            ...withCandidate.transcript,
            { from: 'interviewer', text: `That's it. ${checks[index].explanation}` },
            { from: 'interviewer', text: turn.text },
          ],
          awaiting: 'choice',
          choices: turn.choices,
          stage: session.stage + 1,
        };
      }

      return {
        ...withCandidate,
        transcript: [
          ...withCandidate.transcript,
          { from: 'interviewer', text: `That's it. ${checks[index].explanation}` },
          { from: 'interviewer', text: 'Last thing before you write it: what does this cost, in time and space?' },
        ],
        awaiting: 'choice',
        choices: complexityChoices(problem),
        stage: session.stage + 1,
      };
    }

    // Final stage: complexity, then the hand-off.
    const chosen = session.choices[answer.choiceIndex ?? -1];
    if (!chosen?.correct) {
      return {
        ...withCandidate,
        transcript: [
          ...withCandidate.transcript,
          {
            from: 'interviewer',
            text: `Not what I had in mind. Count how many times each element is handled, and what you keep besides the input. Try again.`,
          },
        ],
        awaiting: 'choice',
        missteps: session.missteps + 1,
      };
    }

    const closing = session.missteps === 0
      ? 'Clean run — you had the invariant and the cost without prompting.'
      : 'Good. You got there, and the places you hesitated are the ones worth reviewing.';

    return {
      ...withCandidate,
      transcript: [
        ...withCandidate.transcript,
        { from: 'interviewer', text: `${problem.complexity.time} time and ${problem.complexity.space} space. ${closing}` },
        { from: 'interviewer', text: 'Your approach holds up. Go and write it, and come back if it fights you.' },
      ],
      awaiting: 'done',
      choices: [],
      stage: session.stage + 1,
      cleared: true,
    };
  },
};

export function leetcodeUrl(problem: Problem): string {
  return `https://leetcode.com/problems/${problem.slug}/`;
}
