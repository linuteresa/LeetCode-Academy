import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * The Supabase client, or null when the project is not configured.
 *
 * Sign-in is an enhancement, not a requirement: with no credentials in the
 * environment the app runs exactly as before, saving progress to localStorage
 * only, and the sign-in control stays hidden.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Needed to pick the session up out of the OAuth redirect URL.
          detectSessionInUrl: true,
        },
      })
    : null;

export const authConfigured = supabase !== null;
