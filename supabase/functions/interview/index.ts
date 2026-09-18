// AlgoCourse practice interviewer.
//
// The browser never holds a model key. This function verifies the caller's
// Supabase session, then talks to the model with a key held as a Supabase
// secret.
//
// Deploy WITH JWT verification (the default). The Supabase OpenAI example uses
// `--no-verify-jwt`, which would leave this endpoint callable by anyone on the
// internet and billed to you:
//
//   supabase functions deploy interview
//   supabase secrets set --env-file ./supabase/.env.local
//
// See artifacts/algo-course/INTERVIEWER.md.

import OpenAI from 'https://deno.land/x/openai@v4.69.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Turn = { from: 'interviewer' | 'candidate'; text: string };

type Body = {
  problem?: {
    title?: string;
    prompt?: string;
    pattern?: string;
    difficulty?: string;
    complexity?: { time?: string; space?: string };
  };
  transcript?: Turn[];
};

const MODEL = Deno.env.get('INTERVIEW_MODEL') ?? 'gpt-4o-mini';
const MAX_TURNS = 40;
const MAX_TEXT = 2000;

/** Only these origins may call the function from a browser. */
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '';
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });
}

const SYSTEM = `You are a calm, experienced technical interviewer helping someone rehearse a coding interview.

Rules:
- Discuss the APPROACH only. Never write the full solution, and never paste code longer than a couple of lines.
- Ask one question at a time and keep replies under about 90 words.
- Probe the invariant, the edge cases, and the time and space cost. Push back when reasoning is vague.
- If the candidate is stuck, give the smallest possible nudge rather than the answer.
- Be direct about mistakes without being unkind.
- When the candidate has articulated a correct approach AND its complexity, say so plainly and end with the exact token [DONE] on its own line.`;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405, origin);

  // Verify the caller is a signed-in user of this project. Without this the
  // endpoint is an open, billable relay.
  const authorization = req.headers.get('authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { authorization } } },
  );
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) return json({ error: 'sign in required' }, 401, origin);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400, origin);
  }

  const problem = body.problem;
  const transcript = Array.isArray(body.transcript) ? body.transcript.slice(-MAX_TURNS) : [];
  if (!problem?.title || !problem.prompt || transcript.length === 0) {
    return json({ error: 'missing problem or transcript' }, 400, origin);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ error: 'interviewer is not configured' }, 500, origin);

  const context = [
    `Problem: ${problem.title} (${problem.difficulty ?? 'unknown'}, pattern: ${problem.pattern ?? 'unknown'}).`,
    `Statement: ${problem.prompt}`,
    problem.complexity?.time
      ? `The intended solution is ${problem.complexity.time} time and ${problem.complexity.space} space. Do not reveal this; use it to judge the candidate.`
      : '',
  ].filter(Boolean).join('\n');

  const messages = [
    { role: 'system' as const, content: `${SYSTEM}\n\n${context}` },
    ...transcript.map((turn) => ({
      role: turn.from === 'interviewer' ? ('assistant' as const) : ('user' as const),
      content: String(turn.text ?? '').slice(0, MAX_TEXT),
    })),
  ];

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const done = raw.includes('[DONE]');
    const reply = raw.replace('[DONE]', '').trim();

    return json({ reply: reply || 'Say a little more about your approach.', done }, 200, origin);
  } catch (error) {
    console.error('interview completion failed', error);
    return json({ error: 'interviewer unavailable' }, 502, origin);
  }
});
