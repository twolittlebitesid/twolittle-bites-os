export type DevSupabaseConfig = {
  supabaseUrl: string;
  publishableKey: string;
  projectRef: string;
};

type Environment = Record<string, string | undefined>;

/** Refuse to connect without an explicitly declared DEV project. */
export function parseDevConfig(env: Environment): DevSupabaseConfig {
  if (env.VITE_ENVIRONMENT !== 'dev') {
    throw new Error('Lingkungan tidak valid: hanya DEV yang diizinkan pada fase ini.');
  }

  const projectRef = env.VITE_DEV_PROJECT_REF?.trim();
  const rawUrl = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!projectRef || !rawUrl || !publishableKey) {
    throw new Error('Konfigurasi Supabase DEV belum lengkap.');
  }
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error('Reference project DEV tidak valid.');
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL Supabase DEV tidak valid.');
  }
  if (url.protocol !== 'https:' || url.hostname !== `${projectRef}.supabase.co` || url.pathname !== '/' || url.search || url.hash || url.port) {
    throw new Error('URL Supabase tidak sesuai dengan reference project DEV.');
  }
  // Publishable key format currently uses sb_publishable_; legacy anon JWTs
  // are deliberately not accepted until the target project is verified.
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('Gunakan publishable key Supabase DEV, bukan secret/service-role key.');
  }
  return { supabaseUrl: url.origin, publishableKey, projectRef };
}
