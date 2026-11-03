import { describe, expect, it } from 'vitest';
import { parseDevConfig } from './config';

const valid = {
  VITE_ENVIRONMENT: 'dev',
  VITE_DEV_PROJECT_REF: 'abcdefghijklmnopqrst',
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key'
};

describe('DEV connection gate', () => {
  it('accepts only explicitly matching DEV project configuration', () => {
    expect(parseDevConfig(valid).projectRef).toBe(valid.VITE_DEV_PROJECT_REF);
  });
  it('rejects a blank environment', () => {
    expect(() => parseDevConfig({})).toThrow(/DEV/);
  });
  it('rejects non-DEV environments', () => {
    expect(() => parseDevConfig({ ...valid, VITE_ENVIRONMENT: 'production' })).toThrow();
  });
  it('rejects a mismatched project URL', () => {
    expect(() => parseDevConfig({ ...valid, VITE_SUPABASE_URL: 'https://differentproject123.supabase.co' })).toThrow();
  });
  it('rejects secret and legacy service-role keys', () => {
    expect(() => parseDevConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fake' })).toThrow();
    expect(() => parseDevConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role_fake' })).toThrow();
  });
  it('rejects redirects, non-HTTPS URLs, and injected paths', () => {
    for (const url of ['http://abcdefghijklmnopqrst.supabase.co', 'https://abcdefghijklmnopqrst.supabase.co/evil', 'https://abcdefghijklmnopqrst.supabase.co?x=1']) {
      expect(() => parseDevConfig({ ...valid, VITE_SUPABASE_URL: url })).toThrow();
    }
  });
});
