import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseDevConfig } from '../config';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = parseDevConfig(import.meta.env);
    client = createClient(config.supabaseUrl, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return client;
}
