import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationRoot = 'supabase/migrations';
const schema = readFileSync(`${migrationRoot}/202610280001_initial_schema.sql`, 'utf8');
const storage = readFileSync(`${migrationRoot}/202610280002_storage.sql`, 'utf8');
const manifest = JSON.parse(readFileSync('specs/reference/LEGACY_SCHEMA_MANIFEST.json', 'utf8')) as {
  table_count: number;
  tables: { table: string; columns: { name: string }[] }[];
};

describe('Draft Supabase schema static source parity', () => {
  it('contains the 33 original tables and all 452 legacy fields in their own definitions', () => {
    expect(manifest.table_count).toBe(33);
    expect(manifest.tables.flatMap(table => table.columns)).toHaveLength(452);
    for (const table of manifest.tables) {
      const body = schema.match(new RegExp(`create table public\\.${table.table} \\(\\n([\\s\\S]*?)\\n\\);`, 'i'))?.[1];
      expect(body, `missing definition: ${table.table}`).toBeDefined();
      for (const column of table.columns) {
        expect(body, `${table.table}.${column.name}`).toMatch(new RegExp(`^  ${column.name}\\s+`, 'm'));
      }
      expect(body).toMatch(/^  org_id uuid not null /m);
    }
  });

  it('enables RLS and prohibits direct authenticated business-table mutations', () => {
    for (const { table } of manifest.tables) {
      expect(schema).toContain(`alter table public.${table} enable row level security;`);
      expect(schema).toContain(`revoke all on public.${table} from anon, authenticated;`);
      expect(schema).toContain(`grant select on public.${table} to authenticated;`);
      expect(schema).not.toMatch(new RegExp(`grant (insert|update|delete|all) on public\\.${table} to authenticated`, 'i'));
    }
    expect(schema).not.toMatch(/disable row level security/i);
  });

  it('requires the runtime payment event enum, scoped uniqueness and private metadata', () => {
    expect(schema).toContain("status in ('SUCCESS','REFUND','FAILED')");
    expect(schema).toContain('payments_reference_org_uq on public.payments(org_id, reference_no)');
    expect(schema).toContain('payment_proofs_read on public.payment_proofs');
    expect(schema).toContain('private.has_org_role(org_id, array[\'OWNER\',\'FINANCE\']::text[])');
  });

  it('keeps the payment proof bucket private and browser uploads disabled', () => {
    expect(storage).toMatch(/'payment-proofs', 'payment-proofs', false/);
    expect(storage).toContain('8388608');
    expect(storage).toContain('on storage.objects for select to authenticated');
    expect(storage).not.toMatch(/on storage\.objects for (insert|update|delete) to authenticated/i);
  });

  it('has distinct migration versions and contains no destructive reset', () => {
    const sqlFiles = readdirSync(migrationRoot).filter(file => file.endsWith('.sql'));
    expect(sqlFiles).toHaveLength(2);
    expect(new Set(sqlFiles.map(file => file.slice(0, 14))).size).toBe(2);
    expect(schema + storage).not.toMatch(/\b(drop table|truncate table|disable row level security)\b/i);
  });
});
