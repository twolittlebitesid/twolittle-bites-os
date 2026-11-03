import { getSupabaseClient } from '../lib/supabase/client';

export async function signIn(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return getSupabaseClient().auth.signOut();
}
