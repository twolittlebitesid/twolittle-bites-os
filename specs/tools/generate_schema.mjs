/**
 * Deterministic blueprint generator from the Hotfix 19 legacy sheet schema.
 * Run: node tools/generate_schema.mjs /path/to/BASELINE_SHEET_SCHEMA.md /path/to/ApiGateway.gs
 * It writes into this blueprint's reference/ and supabase/migrations/ paths.
 * Generated SQL is a REVIEWABLE FRESH-DB STARTER, not a live migration.
 */
import fs from 'node:fs';
import path from 'node:path';

const sourceSchema = process.argv[2];
const sourceApi = process.argv[3];
if (!sourceSchema || !sourceApi) throw new Error('Pass legacy schema and API paths');
const root = path.resolve(import.meta.dirname, '..');
const ref = path.join(root, 'reference');
const migrations = path.join(root, 'supabase', 'migrations');
fs.mkdirSync(ref, { recursive: true });
fs.mkdirSync(migrations, { recursive: true });
const schema = fs.readFileSync(sourceSchema, 'utf8');
const api = fs.readFileSync(sourceApi, 'utf8');
const sections = schema.split(/^## ([A-Z_]+)\s*$/gm);
const tables = [];
for (let i = 1; i < sections.length; i += 2) {
  const name = sections[i];
  if (!/^[A-Z_]+$/.test(name)) continue;
  const rows = sections[i + 1].split('\n').filter(line => line.startsWith('| '));
  if (rows.length < 3) continue;
  const columns = rows.slice(2).map(line => {
    const cells = line.split('|').slice(1, 6).map(v => v.trim());
    return { name: cells[0], legacy_type: cells[1], required: cells[2] === 'Yes', key_reference: cells[3], notes: cells[4] };
  }).filter(v => /^[a-z][a-z0-9_]+$/.test(v.name));
  tables.push({ name, table: name.toLowerCase(), columns });
}
if (tables.length !== 33) throw new Error(`Expected 33 tables, got ${tables.length}`);

const roleRead = {
  config: ['OWNER','ADMIN'], users: ['OWNER'], business_settings: ['OWNER','ADMIN'],
  customers: ['OWNER','ADMIN','FINANCE'],
  products: ['OWNER','ADMIN','FINANCE'], product_variants: ['OWNER','ADMIN','FINANCE'],
  ingredients: ['OWNER','ADMIN','FINANCE'], packaging: ['OWNER','ADMIN','FINANCE'],
  unit_conversions: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  recipes: ['OWNER','ADMIN','PRODUCTION','FINANCE'], recipe_items: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  preorder_campaigns: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  orders: ['OWNER','ADMIN','FINANCE'], order_items: ['OWNER','ADMIN','FINANCE'],
  invoices: ['OWNER','FINANCE'], payments: ['OWNER','FINANCE'],
  production_plans: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  production_plan_items: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  production_requirements: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  production_batches: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  inventory: ['OWNER','ADMIN','FINANCE'],
  inventory_movements: ['OWNER','ADMIN','FINANCE'],
  suppliers: ['OWNER','ADMIN','PRODUCTION','FINANCE'],
  purchases: ['OWNER','ADMIN','FINANCE'], purchase_items: ['OWNER','ADMIN','FINANCE'],
  expenses: ['OWNER','FINANCE'], transactions: ['OWNER','FINANCE'],
  business_targets: ['OWNER','ADMIN','FINANCE'],
  marketing_campaigns: ['OWNER','ADMIN','MARKETING','FINANCE'],
  content: ['OWNER','ADMIN','MARKETING','FINANCE'],
  daily_metrics: ['OWNER','FINANCE'], monthly_metrics: ['OWNER','FINANCE'],
  activity_log: ['OWNER']
};

const fkMap = {
  'customers.favorite_product_id': 'products.product_id',
  'products.base_recipe_id': 'recipes.recipe_id',
  'products.default_packaging_id': 'packaging.packaging_id',
  'product_variants.product_id': 'products.product_id',
  'product_variants.recipe_id': 'recipes.recipe_id',
  'ingredients.default_supplier_id': 'suppliers.supplier_id',
  'packaging.default_supplier_id': 'suppliers.supplier_id',
  'recipes.product_id': 'products.product_id',
  'recipes.variant_id': 'product_variants.variant_id',
  'recipe_items.recipe_id': 'recipes.recipe_id',
  'orders.customer_id': 'customers.customer_id',
  'orders.preorder_campaign_id': 'preorder_campaigns.preorder_campaign_id',
  'order_items.order_id': 'orders.order_id',
  'order_items.product_id': 'products.product_id',
  'order_items.variant_id': 'product_variants.variant_id',
  'invoices.order_id': 'orders.order_id',
  'invoices.customer_id': 'customers.customer_id',
  'payments.invoice_id': 'invoices.invoice_id',
  'payments.order_id': 'orders.order_id',
  'production_plan_items.production_plan_id': 'production_plans.production_plan_id',
  'production_plan_items.product_id': 'products.product_id',
  'production_plan_items.variant_id': 'product_variants.variant_id',
  'production_plan_items.recipe_id': 'recipes.recipe_id',
  'production_requirements.production_plan_id': 'production_plans.production_plan_id',
  'production_requirements.plan_item_id': 'production_plan_items.plan_item_id',
  'production_batches.plan_item_id': 'production_plan_items.plan_item_id',
  'production_batches.product_id': 'products.product_id',
  'production_batches.recipe_id': 'recipes.recipe_id',
  'production_batches.pic_user_id': 'users.user_id',
  'purchases.supplier_id': 'suppliers.supplier_id',
  'purchase_items.purchase_id': 'purchases.purchase_id',
  'content.marketing_campaign_id': 'marketing_campaigns.marketing_campaign_id'
};

function fieldType(f) {
  const t = f.legacy_type.toLowerCase();
  if (f.name === 'before_json' || f.name === 'after_json') return 'jsonb';
  if (t.includes('iso datetime')) return 'timestamptz';
  if (t === 'date') return 'date';
  if (t === 'time') return 'time without time zone';
  if (t === 'month:string' || t.includes('string yyyy-mm')) return 'text';
  if (t.includes('idr integer')) return 'bigint';
  if (t.includes('decimal') || t.includes('idr decimal')) return 'numeric(20,6)';
  if (t.includes('integer')) return 'integer';
  if (t === 'boolean') return 'boolean';
  return 'text';
}

const manifest = {
  source: 'Twolittle.bites OS Hotfix 19 BASELINE_SHEET_SCHEMA.md', generated_on: '2026-10-28',
  caution: 'Mapped fields, not live data. Review before applying to new project.',
  table_count: tables.length, tables
};
fs.writeFileSync(path.join(ref,'LEGACY_SCHEMA_MANIFEST.json'), JSON.stringify(manifest,null,2)+'\n');
const actions = [...api.matchAll(/case '([^']+)':/g)].map(x=>x[1]);
if (actions.length < 80) throw new Error(`API actions too few: ${actions.length}`);
const groups = new Map();
for (const act of actions) {
  const ns = act.split('.')[0];
  if (!groups.has(ns)) groups.set(ns, []);
  groups.get(ns).push(act);
}
let actionMd = `# Legacy ApiGateway.gs actions — Hotfix 19\n\n${actions.length} actions extracted from switch cases. Preserve behavior in rebuilt services; not all are independent REST endpoints.\n\n`;
for (const [ns, arr] of groups) actionMd += `## ${ns} (${arr.length})\n\n${arr.map(a=>'- \`'+a+'\`').join('\n')}\n\n`;
fs.writeFileSync(path.join(ref,'LEGACY_API_ACTIONS.md'),actionMd);

const sql=[];
const add=(...a)=>sql.push(...a);
add('-- GENERATED FROM HOTFIX 19 SCHEMA — REVIEW BEFORE APPLYING TO A NEW DEV DATABASE.',
  '-- All business tables are SELECT-only to approved roles; NO client DML grants.',
  '-- Edge business functions / transactional RPCs remain to be implemented.',
  'begin;',
  'create extension if not exists pgcrypto;',
  'create schema if not exists private;',
  'revoke all on schema private from public, anon;',
  'grant usage on schema private to authenticated;',
  `create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);`,
  `create table if not exists public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','PRODUCTION','MARKETING','FINANCE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);`,
  `create or replace function private.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE' and m.role = any(p_roles)
  );
$$;`,
  'revoke all on function private.has_org_role(uuid,text[]) from public, anon;',
  'grant execute on function private.has_org_role(uuid,text[]) to authenticated;',
  'alter table public.organizations enable row level security;',
  'alter table public.memberships enable row level security;',
  `create policy org_read on public.organizations for select to authenticated
  using (private.has_org_role(id, array['OWNER','ADMIN','PRODUCTION','MARKETING','FINANCE']::text[]));`,
  `create policy member_self_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));`,
  'revoke all on public.organizations, public.memberships from anon, authenticated;',
  'grant select on public.organizations, public.memberships to authenticated;',
  ''
);

for(const t of tables){
  const pk=t.table==='daily_metrics'?['metric_date','metric_key']:t.table==='monthly_metrics'?['month','metric_key']:[t.columns[0].name];
  const defs=['  org_id uuid not null references public.organizations(id) on delete restrict'];
  for(const f of t.columns){
    // Supabase Edition stores newly issued public invoice tokens as hashes;
    // legacy plaintext tokens remain an optional import compatibility field.
    const nullable=(f.required && !(t.table==='invoices' && f.name==='public_token'))?' not null':'';
    defs.push(`  ${f.name} ${fieldType(f)}${nullable}`);
  }
  if (t.table==='invoices') {
    defs.push('  public_token_hash text');
    defs.push('  public_token_revoked_at timestamptz');
  }
  defs.push(`  primary key (org_id, ${pk.join(', ')})`);
  const lines=`create table public.${t.table} (\n${defs.join(',\n')}\n);`;
  add(lines,`alter table public.${t.table} enable row level security;`);
  const roles=roleRead[t.table];
  if(!roles)throw new Error('No RLS roles for '+t.table);
  const roleSql=roles.map(r=>`'${r}'`).join(',');
  add(`create policy ${t.table}_read on public.${t.table} for select to authenticated\n  using (private.has_org_role(org_id, array[${roleSql}]::text[]));`,
    `revoke all on public.${t.table} from anon, authenticated;`,
    `grant select on public.${t.table} to authenticated;`,'');
}

add('-- Cross-table references are deferred to this second pass (cycles exist).');
for (const [source,target] of Object.entries(fkMap)) {
  const [table,col]=source.split('.');
  const [toTable,toCol]=target.split('.');
  add(`alter table public.${table} add constraint fk_${table}_${col}\n  foreign key (org_id, ${col}) references public.${toTable}(org_id, ${toCol})\n  deferrable initially deferred;`);
}
add('');

const unique = [
  ['products','sku'],['product_variants','sku'],['users','email'],
  ['invoices','invoice_number'],
  ['inventory','item_type, item_id']
];
for(const [table,fields] of unique){
  add(`create unique index ${table}_${fields.replaceAll(', ','_')}_org_uq on public.${table}(org_id, ${fields});`);
}
add(`create unique index payments_reference_org_uq on public.payments(org_id, reference_no)
  where reference_no is not null and btrim(reference_no) <> '';`,
  `create unique index invoices_legacy_public_token_uq on public.invoices(public_token)
  where public_token is not null and btrim(public_token) <> '';`,
  `create unique index invoices_public_token_hash_uq on public.invoices(public_token_hash)
  where public_token_hash is not null;`,
  `create unique index invoices_one_active_per_order_uq on public.invoices(org_id, order_id)
  where status not in ('CANCELLED','REFUNDED');`,
  `create unique index transactions_payment_event_uq on public.transactions(org_id, reference_id)
  where reference_type = 'PAYMENT' and reference_id is not null;`,
  `create index idx_orders_customer_date on public.orders(org_id, customer_id, order_date desc);`,
  `create index idx_order_items_order on public.order_items(org_id, order_id);`,
  `create index idx_invoices_order on public.invoices(org_id, order_id);`,
  `create index idx_payments_invoice_at on public.payments(org_id, invoice_id, payment_at desc);`,
  `create index idx_movements_item_at on public.inventory_movements(org_id, item_type, item_id, movement_at desc);`,
  `create index idx_purchases_supplier_date on public.purchases(org_id, supplier_id, purchase_date desc);`,
  `create index idx_production_plan_date on public.production_plans(org_id, production_date desc);`,
  `create index idx_marketing_campaign_date on public.marketing_campaigns(org_id, start_date desc);`,
  `create index idx_activity_log_at on public.activity_log(org_id, timestamp desc);`,
  ''
);
const moneyNonnegative = {
  products:['selling_price','current_cogs'], orders:['subtotal','discount','delivery_fee','tax','grand_total'],
  order_items:['unit_price','line_discount','line_total'],
  invoices:['subtotal','discount','delivery_fee','tax','grand_total','paid_amount','remaining_amount'],
  payments:['amount'],
  purchases:['subtotal','delivery_cost','total_cost'],
  purchase_items:['unit_cost','total_cost'],
  expenses:['amount'], transactions:['amount_in','amount_out']
};
for (const [table,cols] of Object.entries(moneyNonnegative)) {
  for (const col of cols) add(`alter table public.${table} add constraint chk_${table}_${col}_nonnegative check (${col} >= 0);`);
}
add(`alter table public.payments add constraint chk_payment_event_type
  check (status in ('SUCCESS','REFUND','FAILED'));`,
  `alter table public.invoices add constraint chk_invoice_has_public_token
  check (public_token is not null or public_token_hash is not null);`,
  `alter table public.orders add constraint chk_order_state
  check (order_status in ('DRAFT','WAITING_PAYMENT','CONFIRMED','SCHEDULED','IN_PRODUCTION','READY','ON_DELIVERY','COMPLETED','CANCELLED'));`,
  `alter table public.monthly_metrics add constraint chk_month_format check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');`,
  `alter table public.payments add constraint chk_success_refund_positive check (status = 'FAILED' or amount > 0);`,
  `alter table public.order_items add constraint chk_order_item_quantity_positive check (quantity > 0);`,
  ''
);

add(`create table public.business_id_counters (
  org_id uuid not null references public.organizations(id) on delete restrict,
  prefix text not null,
  period text not null,
  current_value bigint not null default 0 check (current_value >= 0),
  primary key (org_id,prefix,period)
);`,
  `alter table public.business_id_counters enable row level security;`,
  `revoke all on public.business_id_counters from anon, authenticated;`,
  `create table public.operation_idempotency (
  org_id uuid not null references public.organizations(id) on delete restrict,
  operation text not null,
  request_key text not null,
  payload_hash text not null,
  result_json jsonb,
  created_at timestamptz not null default now(),
  primary key (org_id,operation,request_key)
);`,
  `alter table public.operation_idempotency enable row level security;`,
  `revoke all on public.operation_idempotency from anon, authenticated;`,
  `create table public.outbox_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete restrict,
  event_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'PENDING' check (state in ('PENDING','RUNNING','DONE','FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`,
  `create index idx_outbox_next on public.outbox_jobs(state,next_attempt_at);`,
  `alter table public.outbox_jobs enable row level security;`,
  `revoke all on public.outbox_jobs from anon, authenticated;`,
  `create table public.payment_proofs (
  org_id uuid not null,
  payment_id text not null,
  bucket text not null default 'payment-proofs' check (bucket = 'payment-proofs'),
  object_path text not null,
  original_name text,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 8388608),
  status text not null check (status in ('PENDING','READY','FAILED')),
  created_at timestamptz not null default now(),
  primary key (org_id,payment_id),
  unique (bucket,object_path),
  foreign key (org_id,payment_id) references public.payments(org_id,payment_id) on delete restrict
);`,
  `alter table public.payment_proofs enable row level security;`,
  `create policy payment_proofs_read on public.payment_proofs for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));`,
  `revoke all on public.payment_proofs from anon, authenticated;`,
  `grant select on public.payment_proofs to authenticated;`,
  `-- CRITICAL: payment_proofs is metadata only; file upload/finalize is not atomic with SQL.`,
  `-- Implement server-side signed upload intent, validation, transaction and cleanup saga.`,
  `-- Implement atomic payment/refund/stock/preorder RPCs BEFORE enabling mutation routes.`,
  'commit;',''
);
const sqlFile=path.join(migrations,'202610280001_initial_schema.sql');
fs.writeFileSync(sqlFile, sql.join('\n')+'\n');
console.log(JSON.stringify({table_count:tables.length, field_count:tables.reduce((n,t)=>n+t.columns.length,0), legacy_actions:actions.length, fk_count:Object.keys(fkMap).length,sql_file:sqlFile}));
