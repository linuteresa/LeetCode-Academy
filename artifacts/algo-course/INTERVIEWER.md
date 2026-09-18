# The practice interviewer

Practice mode runs a conversation about the approach before you write code.
There are two interviewers behind the same interface, and the panel does not
know which one it is talking to.

| | Scripted (default) | Hosted |
| --- | --- | --- |
| Needs a key | no | yes, held server-side |
| Needs sign-in | no | yes |
| Reads free-form reasoning | no | yes |
| Works offline | yes | no |
| Cost | none | per message |

With `VITE_INTERVIEW_ENDPOINT` unset, the scripted interviewer runs and nothing
calls out to the network.

## Deploying the hosted interviewer

The function is `supabase/functions/interview/index.ts`.

### 1. Put the model key in Supabase

```bash
echo 'OPENAI_API_KEY=sk-...' > supabase/.env.local
supabase secrets set --env-file ./supabase/.env.local
```

Also set the origins allowed to call it, comma separated, and optionally the
model:

```bash
supabase secrets set ALLOWED_ORIGINS='https://linuteresa.github.io,http://localhost:5173'
supabase secrets set INTERVIEW_MODEL='gpt-4o-mini'
```

### 2. Deploy it — with JWT verification

```bash
supabase functions deploy interview
```

**Not** `--no-verify-jwt`. Supabase's OpenAI example uses that flag, and it is
wrong here: this endpoint spends your money on every call, so it must not be
callable by anyone who finds the URL. The function checks
`supabase.auth.getUser()` and returns 401 without a valid session, and the
deploy flag has to agree with that.

### 3. Point the app at it

```
VITE_INTERVIEW_ENDPOINT=https://<project-ref>.functions.supabase.co/interview
```

Set it as a GitHub Actions repository secret and add it to the build step in
`.github/workflows/deploy-pages.yml`, the same way the Supabase URL and key are
passed. Unlike those two, this one is not sensitive — it is just a URL — but
the app treats an empty value as "no hosted interviewer" either way.

## What the function does and does not do

- It verifies the caller is a signed-in user of this Supabase project.
- It replies only to allowed origins, from `ALLOWED_ORIGINS`.
- It caps the transcript at 40 turns and each message at 2000 characters, and
  the client caps them again before sending.
- It is told the intended complexity so it can judge an answer, with an
  instruction not to reveal it. That is a prompt-level instruction, not a
  guarantee: a determined user can talk a model into most things. Nothing
  secret should ever be put in that context.
- **It does not rate limit per user.** A signed-in user can call it in a loop.
  If that matters, add a counter table with a row per user per day and reject
  above a threshold, or put the function behind a paid-tier check.

## Swapping OpenAI for something else

`createRemoteInterviewer` only cares about the response shape
`{ reply: string, done?: boolean }`. To use Gemini or another provider, change
the completion call inside the function and leave everything else alone.
