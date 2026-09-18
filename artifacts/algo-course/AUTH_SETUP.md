# Google sign-in setup

Progress is saved to `localStorage` by default. Sign-in is an optional layer on
top: when a learner signs in with Google, their progress is merged into a row in
Supabase and follows them between devices. With no Supabase credentials in the
environment, the app behaves exactly as it did before — the sign-in control is
hidden and nothing calls out to the network.

## What is already done

The Supabase project `leetcode-academy` (ref `mbdpornhjpruicwxjnpt`, region
`us-east-2`, free tier) exists and holds a `public.progress` table:

| column       | type          | notes                                       |
| ------------ | ------------- | ------------------------------------------- |
| `user_id`    | `uuid`        | primary key, references `auth.users`        |
| `statuses`   | `jsonb`       | slug → `not-started` / `in-progress` / `completed` |
| `bookmarks`  | `jsonb`       | array of slugs                              |
| `streak`     | `integer`     |                                             |
| `last_slug`  | `text`        |                                             |
| `updated_at` | `timestamptz` | set by a trigger, not by the client         |

Row-level security is on, with select/insert/update/delete policies that each
require `auth.uid() = user_id`. A signed-in learner can only ever read or write
their own row, which is what makes it safe to ship the publishable key.

## What still needs doing (needs your Google account)

1. **Create a Google OAuth client.** In the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID of type *Web application*. Add
   `https://mbdpornhjpruicwxjnpt.supabase.co/auth/v1/callback` as an authorised
   redirect URI.
2. **Enable the provider in Supabase.** In the project dashboard, under
   *Authentication → Sign In / Providers → Google*, switch Google on and paste
   the client ID and client secret from step 1.
3. **Set the redirect URLs.** Under *Authentication → URL Configuration*, set the
   site URL to the deployed app and add both the deployed origin and
   `http://localhost:5173` to the additional redirect URLs.
4. **Set the environment variables** wherever the app is served (Replit secrets
   for the deployment, `.env.local` for local dev) — see `.env.example`:

   ```
   VITE_SUPABASE_URL=https://mbdpornhjpruicwxjnpt.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5HKcg5cX985j3KSUq7Axzw_R3tTUcEg
   ```

Until step 2 is done, clicking *Sign in* reaches Supabase and comes back with
`provider is not enabled` — that is the expected state, not a bug in the wiring.

## How syncing behaves

- **Signed out.** State lives in memory and is mirrored to `localStorage`, as before.
- **On sign-in.** The remote row is fetched once and merged with whatever is on
  the device. A problem never moves backwards: the further-along status wins,
  bookmarks are unioned, the longer streak is kept.
- **After that.** Every change is written to `localStorage` immediately and
  pushed to Supabase on an 800 ms debounce, so a burst of clicks is one request.
- **If the network fails.** The local copy is still correct and the account menu
  says so; the next successful write reconciles it.
