import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = ['README.md','PRD.md','DESIGN.md','ARCHITECTURE.md','DATA_MODEL.md','SECURITY.md',
  'WORKFLOWS.md','API_CONTRACT.md','MIGRATION.md','QA_TEST_PLAN.md','IMPLEMENTATION_PLAN.md',
  'DECISIONS_AND_GAPS.md','BUILD_PROMPT.md','REFERENCE_SOURCES.md','.env.example',
  'reference/LEGACY_SHEET_SCHEMA.md','reference/LEGACY_PERMISSION_MATRIX.md',
  'reference/LEGACY_DESIGN.md','reference/LEGACY_SCHEMA_MANIFEST.json',
  'reference/LEGACY_API_ACTIONS.md','reference/Twolittle_Bites_Hotfix19_Source.zip',
  'supabase/migrations/202610280001_initial_schema.sql','supabase/migrations/202610280002_storage.sql'];
for (const file of required) {
  if (!fs.statSync(path.join(root,file)).isFile()) throw new Error('Missing '+file);
}
const m = JSON.parse(fs.readFileSync(path.join(root,'reference/LEGACY_SCHEMA_MANIFEST.json'),'utf8'));
if (m.table_count!==33 || m.tables.length!==33) throw new Error('Table count invalid');
const sql=fs.readFileSync(path.join(root,'supabase/migrations/202610280001_initial_schema.sql'),'utf8');
for (const t of m.tables) {
  if (!sql.includes('create table public.'+t.table+' (')) throw new Error('Missing SQL '+t.table);
  if (!sql.includes('alter table public.'+t.table+' enable row level security;')) throw new Error('Missing RLS '+t.table);
  for (const f of t.columns) if (!sql.includes('  '+f.name+' ')) throw new Error('Missing field '+t.table+'.'+f.name);
}
const api = fs.readFileSync(path.join(root,'reference/LEGACY_API_ACTIONS.md'),'utf8');
const acts= [...api.matchAll(/^- `([^`]+)`$/gm)].map(m=>m[1]);
if(acts.length!==108 || new Set(acts).size!==108)throw new Error('API action inventory invalid');
if(!sql.includes('create policy payments_read') || !sql.includes('payments_reference_org_uq')) throw new Error('Payment guards missing');
if(!sql.includes('create policy payment_proofs_read') || !sql.includes('public.payment_proofs'))throw new Error('Proof metadata missing');
const files=fs.readdirSync(root).length;
console.log(JSON.stringify({result:'PASS',canonical_tables:m.table_count,legacy_columns:m.tables.reduce((n,t)=>n+t.columns.length,0),legacy_api_actions:acts.length,top_level_items:files}));
