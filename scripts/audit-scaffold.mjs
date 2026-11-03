import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const sources = walk('src').filter(path => /\.(ts|tsx)$/.test(path));
for (const path of sources) {
  const contents = readFileSync(path, 'utf8');
  if (/sb_secret_[a-zA-Z0-9]{8,}/.test(contents) || /eyJ[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{20,}/.test(contents)) {
    throw new Error(`Potential embedded secret found in ${path}`);
  }
}
const schema = readFileSync('supabase/migrations/202610280001_initial_schema.sql', 'utf8');
const storage = readFileSync('supabase/migrations/202610280002_storage.sql', 'utf8');
if (/\bdisable\s+row\s+level\s+security\b|\bdrop\s+table\b|\bgrant\s+(insert|update|delete|all)\b[^;]*\bto\s+(anon|authenticated)\b/i.test(schema + '\n' + storage)) {
  throw new Error('DDL contains a prohibited RLS disable, destructive drop, or client write grant.');
}
if (!/['"]payment-proofs['"],\s*['"]payment-proofs['"],\s*false/i.test(storage)) {
  throw new Error('Payment proof Storage bucket must stay private.');
}
console.log(`PASS: scanned ${sources.length} frontend source files; no embedded secrets, client write grants, RLS disable, or public proof bucket.`);
