/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://<ref>.supabase.co. Optional: without it the app stays local-only. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Safe to ship to the browser; row-level security is what protects the data. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Supabase Edge Function URL for the AI interviewer. Unset = scripted interviewer. */
  readonly VITE_INTERVIEW_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
