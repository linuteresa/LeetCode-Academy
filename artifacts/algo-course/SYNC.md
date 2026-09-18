# How progress syncs

Progress lives in `localStorage` and, when signed in, in a `progress` row in
Supabase. Two copies of the same account can disagree — two tabs, two devices,
or an edit made while offline — so they are reconciled per change rather than
by one side overwriting the other.

## Per-change timestamps

`Persisted.updatedAt` maps a change key to an epoch millisecond stamp:

- `s:<slug>` — when this problem's status last changed
- `b:<slug>` — when this problem's bookmark was last toggled

`reconcile()` walks the union of both sides and keeps the newer decision for
each key independently. That is what lets a deliberate un-complete or
un-bookmark survive: it carries a newer timestamp than the completion it
replaced, so it wins instead of being unioned away.

A whole-object rule cannot express this. "Furthest status wins" resurrects
undone work; "server wins" throws away edits that have not been uploaded yet.

## Where the timestamps are stored

The `progress` table has `statuses jsonb`, `bookmarks jsonb`, `streak`,
`last_slug` and `updated_at`. Because `bookmarks` is `jsonb`, the clock rides
inside it as `{ list: string[], at: ChangeClock }` and needs no extra column.
Rows written before this change stored a plain `string[]`; those load with an
empty clock and lose to anything timestamped, which is the correct outcome.

## What is not synced yet

`recent` and `lastActiveDate` are device-local. They have no column, and adding
one needs a migration that has not been applied:

```sql
alter table public.progress
  add column recent jsonb not null default '[]'::jsonb,
  add column last_active_date date;
```

Until then:

- `reconcile()` treats the device copy of both fields as authoritative and never
  lets a hydrate wipe them.
- "Recently in your orbit" is per device.
- `streak` itself syncs, but the date it is computed from does not, so a brand
  new device restarts the count on its first activity.

After running the migration, include both columns in the select and upsert in
`use-progress.ts` and reconcile them the same way as the rest.
