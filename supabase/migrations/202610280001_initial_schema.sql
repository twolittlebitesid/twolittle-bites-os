-- GENERATED FROM HOTFIX 19 SCHEMA — REVIEW BEFORE APPLYING TO A NEW DEV DATABASE.
-- All business tables are SELECT-only to approved roles; NO client DML grants.
-- Edge business functions / transactional RPCs remain to be implemented.
begin;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','PRODUCTION','MARKETING','FINANCE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create or replace function private.has_org_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
      and m.status = 'ACTIVE' and m.role = any(p_roles)
  );
$$;
revoke all on function private.has_org_role(uuid,text[]) from public, anon;
grant execute on function private.has_org_role(uuid,text[]) to authenticated;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
create policy org_read on public.organizations for select to authenticated
  using (private.has_org_role(id, array['OWNER','ADMIN','PRODUCTION','MARKETING','FINANCE']::text[]));
create policy member_self_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.organizations, public.memberships from anon, authenticated;
grant select on public.organizations, public.memberships to authenticated;

create table public.config (
  org_id uuid not null references public.organizations(id) on delete restrict,
  config_key text not null,
  config_value text not null,
  value_type text not null,
  description text,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, config_key)
);
alter table public.config enable row level security;
create policy config_read on public.config for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN']::text[]));
revoke all on public.config from anon, authenticated;
grant select on public.config to authenticated;

create table public.users (
  org_id uuid not null references public.organizations(id) on delete restrict,
  user_id text not null,
  email text not null,
  display_name text not null,
  role text not null,
  status text not null,
  last_login_at timestamptz,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, user_id)
);
alter table public.users enable row level security;
create policy users_read on public.users for select to authenticated
  using (private.has_org_role(org_id, array['OWNER']::text[]));
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;

create table public.business_settings (
  org_id uuid not null references public.organizations(id) on delete restrict,
  setting_key text not null,
  setting_value text not null,
  value_type text not null,
  group_name text not null,
  description text,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, setting_key)
);
alter table public.business_settings enable row level security;
create policy business_settings_read on public.business_settings for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN']::text[]));
revoke all on public.business_settings from anon, authenticated;
grant select on public.business_settings to authenticated;

create table public.customers (
  org_id uuid not null references public.organizations(id) on delete restrict,
  customer_id text not null,
  name text not null,
  whatsapp text not null,
  email text,
  default_address text,
  segment text not null,
  first_order_date date,
  last_order_date date,
  total_orders integer not null,
  total_spend bigint not null,
  average_order_value bigint not null,
  favorite_product_id text,
  notes text,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, customer_id)
);
alter table public.customers enable row level security;
create policy customers_read on public.customers for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;

create table public.products (
  org_id uuid not null references public.organizations(id) on delete restrict,
  product_id text not null,
  sku text not null,
  product_name text not null,
  category text not null,
  selling_price bigint not null,
  base_recipe_id text,
  default_packaging_id text,
  image_url text,
  current_cogs bigint not null,
  gross_profit bigint not null,
  gross_margin_pct numeric(20,6) not null,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, product_id)
);
alter table public.products enable row level security;
create policy products_read on public.products for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.products from anon, authenticated;
grant select on public.products to authenticated;

create table public.product_variants (
  org_id uuid not null references public.organizations(id) on delete restrict,
  variant_id text not null,
  product_id text not null,
  variant_name text not null,
  size text,
  sku text not null,
  selling_price_override bigint,
  recipe_id text,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, variant_id)
);
alter table public.product_variants enable row level security;
create policy product_variants_read on public.product_variants for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.product_variants from anon, authenticated;
grant select on public.product_variants to authenticated;

create table public.ingredients (
  org_id uuid not null references public.organizations(id) on delete restrict,
  ingredient_id text not null,
  ingredient_name text not null,
  category text not null,
  base_unit text not null,
  purchase_unit text not null,
  purchase_to_base_factor numeric(20,6) not null,
  minimum_stock_base numeric(20,6) not null,
  average_cost_per_base_unit numeric(20,6) not null,
  latest_cost_per_base_unit numeric(20,6) not null,
  default_supplier_id text,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, ingredient_id)
);
alter table public.ingredients enable row level security;
create policy ingredients_read on public.ingredients for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.ingredients from anon, authenticated;
grant select on public.ingredients to authenticated;

create table public.packaging (
  org_id uuid not null references public.organizations(id) on delete restrict,
  packaging_id text not null,
  packaging_name text not null,
  category text not null,
  base_unit text not null,
  purchase_unit text not null,
  purchase_to_base_factor numeric(20,6) not null,
  minimum_stock_base numeric(20,6) not null,
  average_cost_per_base_unit numeric(20,6) not null,
  latest_cost_per_base_unit numeric(20,6) not null,
  default_supplier_id text,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, packaging_id)
);
alter table public.packaging enable row level security;
create policy packaging_read on public.packaging for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.packaging from anon, authenticated;
grant select on public.packaging to authenticated;

create table public.unit_conversions (
  org_id uuid not null references public.organizations(id) on delete restrict,
  conversion_id text not null,
  scope text not null,
  item_type text,
  item_id text,
  from_unit text not null,
  to_unit text not null,
  factor numeric(20,6) not null,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, conversion_id)
);
alter table public.unit_conversions enable row level security;
create policy unit_conversions_read on public.unit_conversions for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.unit_conversions from anon, authenticated;
grant select on public.unit_conversions to authenticated;

create table public.recipes (
  org_id uuid not null references public.organizations(id) on delete restrict,
  recipe_id text not null,
  product_id text not null,
  variant_id text,
  recipe_name text not null,
  base_yield numeric(20,6) not null,
  yield_unit text not null,
  scaling_mode text not null,
  version integer not null,
  status text not null,
  effective_from date,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, recipe_id)
);
alter table public.recipes enable row level security;
create policy recipes_read on public.recipes for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.recipes from anon, authenticated;
grant select on public.recipes to authenticated;

create table public.recipe_items (
  org_id uuid not null references public.organizations(id) on delete restrict,
  recipe_item_id text not null,
  recipe_id text not null,
  item_type text not null,
  item_id text not null,
  quantity numeric(20,6) not null,
  unit text not null,
  quantity_base numeric(20,6) not null,
  waste_allowance_pct numeric(20,6) not null,
  sort_order integer not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, recipe_item_id)
);
alter table public.recipe_items enable row level security;
create policy recipe_items_read on public.recipe_items for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.recipe_items from anon, authenticated;
grant select on public.recipe_items to authenticated;

create table public.preorder_campaigns (
  org_id uuid not null references public.organizations(id) on delete restrict,
  preorder_campaign_id text not null,
  campaign_name text not null,
  start_at timestamptz not null,
  cutoff_at timestamptz not null,
  production_date date not null,
  fulfillment_date date not null,
  maximum_capacity numeric(20,6) not null,
  capacity_unit text not null,
  current_booked numeric(20,6) not null,
  remaining_capacity numeric(20,6) not null,
  status text not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, preorder_campaign_id)
);
alter table public.preorder_campaigns enable row level security;
create policy preorder_campaigns_read on public.preorder_campaigns for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.preorder_campaigns from anon, authenticated;
grant select on public.preorder_campaigns to authenticated;

create table public.orders (
  org_id uuid not null references public.organizations(id) on delete restrict,
  order_id text not null,
  order_date date not null,
  customer_id text not null,
  source_channel text not null,
  preorder_campaign_id text,
  order_status text not null,
  payment_status text not null,
  invoice_status text not null,
  fulfillment_type text not null,
  fulfillment_date date,
  fulfillment_time_start time without time zone,
  fulfillment_time_end time without time zone,
  delivery_address text,
  subtotal bigint not null,
  discount bigint not null,
  delivery_fee bigint not null,
  tax bigint not null,
  grand_total bigint not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, order_id)
);
alter table public.orders enable row level security;
create policy orders_read on public.orders for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;

create table public.order_items (
  org_id uuid not null references public.organizations(id) on delete restrict,
  order_item_id text not null,
  order_id text not null,
  product_id text not null,
  variant_id text,
  product_name_snapshot text not null,
  sku_snapshot text not null,
  quantity numeric(20,6) not null,
  unit_price bigint not null,
  line_discount bigint not null,
  line_total bigint not null,
  production_notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, order_item_id)
);
alter table public.order_items enable row level security;
create policy order_items_read on public.order_items for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

create table public.invoices (
  org_id uuid not null references public.organizations(id) on delete restrict,
  invoice_id text not null,
  invoice_number text not null,
  order_id text not null,
  customer_id text not null,
  invoice_date date not null,
  due_at timestamptz,
  subtotal bigint not null,
  discount bigint not null,
  delivery_fee bigint not null,
  tax bigint not null,
  grand_total bigint not null,
  paid_amount bigint not null,
  remaining_amount bigint not null,
  status text not null,
  last_payment_method text,
  public_token text,
  invoice_url text not null,
  sent_at timestamptz,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  public_token_hash text,
  public_token_revoked_at timestamptz,
  primary key (org_id, invoice_id)
);
alter table public.invoices enable row level security;
create policy invoices_read on public.invoices for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;

create table public.payments (
  org_id uuid not null references public.organizations(id) on delete restrict,
  payment_id text not null,
  invoice_id text not null,
  order_id text not null,
  payment_at timestamptz not null,
  amount bigint not null,
  payment_method text not null,
  reference_no text,
  status text not null,
  proof_url text,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, payment_id)
);
alter table public.payments enable row level security;
create policy payments_read on public.payments for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

create table public.production_plans (
  org_id uuid not null references public.organizations(id) on delete restrict,
  production_plan_id text not null,
  production_date date not null,
  source_type text not null,
  source_id text,
  status text not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, production_plan_id)
);
alter table public.production_plans enable row level security;
create policy production_plans_read on public.production_plans for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.production_plans from anon, authenticated;
grant select on public.production_plans to authenticated;

create table public.production_plan_items (
  org_id uuid not null references public.organizations(id) on delete restrict,
  plan_item_id text not null,
  production_plan_id text not null,
  product_id text not null,
  variant_id text,
  recipe_id text not null,
  recipe_version integer not null,
  target_quantity numeric(20,6) not null,
  target_unit text not null,
  scaling_mode text not null,
  multiplier numeric(20,6) not null,
  required_batches numeric(20,6) not null,
  expected_output numeric(20,6) not null,
  expected_surplus numeric(20,6) not null,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, plan_item_id)
);
alter table public.production_plan_items enable row level security;
create policy production_plan_items_read on public.production_plan_items for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.production_plan_items from anon, authenticated;
grant select on public.production_plan_items to authenticated;

create table public.production_requirements (
  org_id uuid not null references public.organizations(id) on delete restrict,
  requirement_id text not null,
  production_plan_id text not null,
  plan_item_id text,
  item_type text not null,
  item_id text not null,
  required_qty_base numeric(20,6) not null,
  available_stock_base numeric(20,6) not null,
  shortage_qty_base numeric(20,6) not null,
  base_unit text not null,
  status text not null,
  calculated_at timestamptz not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, requirement_id)
);
alter table public.production_requirements enable row level security;
create policy production_requirements_read on public.production_requirements for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.production_requirements from anon, authenticated;
grant select on public.production_requirements to authenticated;

create table public.production_batches (
  org_id uuid not null references public.organizations(id) on delete restrict,
  production_batch_id text not null,
  plan_item_id text not null,
  product_id text not null,
  recipe_id text not null,
  recipe_version integer not null,
  batch_no integer not null,
  planned_qty numeric(20,6) not null,
  actual_qty numeric(20,6),
  failed_qty numeric(20,6),
  waste_qty numeric(20,6),
  yield_rate_pct numeric(20,6),
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  pic_user_id text,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, production_batch_id)
);
alter table public.production_batches enable row level security;
create policy production_batches_read on public.production_batches for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.production_batches from anon, authenticated;
grant select on public.production_batches to authenticated;

create table public.inventory (
  org_id uuid not null references public.organizations(id) on delete restrict,
  inventory_id text not null,
  item_type text not null,
  item_id text not null,
  current_stock_base numeric(20,6) not null,
  minimum_stock_base numeric(20,6) not null,
  average_cost_per_base_unit numeric(20,6) not null,
  last_movement_at timestamptz,
  updated_at timestamptz not null,
  primary key (org_id, inventory_id)
);
alter table public.inventory enable row level security;
create policy inventory_read on public.inventory for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.inventory from anon, authenticated;
grant select on public.inventory to authenticated;

create table public.inventory_movements (
  org_id uuid not null references public.organizations(id) on delete restrict,
  movement_id text not null,
  movement_at timestamptz not null,
  item_type text not null,
  item_id text not null,
  movement_type text not null,
  quantity_in_base numeric(20,6) not null,
  quantity_out_base numeric(20,6) not null,
  balance_after_base numeric(20,6) not null,
  base_unit text not null,
  reference_type text,
  reference_id text,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, movement_id)
);
alter table public.inventory_movements enable row level security;
create policy inventory_movements_read on public.inventory_movements for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.inventory_movements from anon, authenticated;
grant select on public.inventory_movements to authenticated;

create table public.suppliers (
  org_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id text not null,
  supplier_name text not null,
  contact_person text,
  whatsapp text,
  email text,
  address text,
  lead_time_days integer,
  minimum_order_value bigint,
  status text not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, supplier_id)
);
alter table public.suppliers enable row level security;
create policy suppliers_read on public.suppliers for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','PRODUCTION','FINANCE']::text[]));
revoke all on public.suppliers from anon, authenticated;
grant select on public.suppliers to authenticated;

create table public.purchases (
  org_id uuid not null references public.organizations(id) on delete restrict,
  purchase_id text not null,
  supplier_id text not null,
  purchase_date date not null,
  expected_date date,
  received_date date,
  status text not null,
  payment_status text not null,
  subtotal bigint not null,
  delivery_cost bigint not null,
  total_cost bigint not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, purchase_id)
);
alter table public.purchases enable row level security;
create policy purchases_read on public.purchases for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.purchases from anon, authenticated;
grant select on public.purchases to authenticated;

create table public.purchase_items (
  org_id uuid not null references public.organizations(id) on delete restrict,
  purchase_item_id text not null,
  purchase_id text not null,
  item_type text not null,
  item_id text not null,
  quantity numeric(20,6) not null,
  unit text not null,
  quantity_base numeric(20,6) not null,
  unit_cost numeric(20,6) not null,
  total_cost bigint not null,
  received_qty_base numeric(20,6) not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, purchase_item_id)
);
alter table public.purchase_items enable row level security;
create policy purchase_items_read on public.purchase_items for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.purchase_items from anon, authenticated;
grant select on public.purchase_items to authenticated;

create table public.expenses (
  org_id uuid not null references public.organizations(id) on delete restrict,
  expense_id text not null,
  expense_date date not null,
  category text not null,
  vendor text,
  amount bigint not null,
  payment_method text not null,
  receipt_url text,
  status text not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, expense_id)
);
alter table public.expenses enable row level security;
create policy expenses_read on public.expenses for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.expenses from anon, authenticated;
grant select on public.expenses to authenticated;

create table public.transactions (
  org_id uuid not null references public.organizations(id) on delete restrict,
  transaction_id text not null,
  transaction_at timestamptz not null,
  transaction_type text not null,
  category text,
  reference_type text,
  reference_id text,
  amount_in bigint not null,
  amount_out bigint not null,
  payment_method text,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, transaction_id)
);
alter table public.transactions enable row level security;
create policy transactions_read on public.transactions for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.transactions from anon, authenticated;
grant select on public.transactions to authenticated;

create table public.business_targets (
  org_id uuid not null references public.organizations(id) on delete restrict,
  target_id text not null,
  period_type text not null,
  period_start date not null,
  period_end date not null,
  metric_key text not null,
  target_value numeric(20,6) not null,
  unit text not null,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, target_id)
);
alter table public.business_targets enable row level security;
create policy business_targets_read on public.business_targets for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','FINANCE']::text[]));
revoke all on public.business_targets from anon, authenticated;
grant select on public.business_targets to authenticated;

create table public.marketing_campaigns (
  org_id uuid not null references public.organizations(id) on delete restrict,
  marketing_campaign_id text not null,
  campaign_name text not null,
  start_date date not null,
  end_date date,
  budget bigint not null,
  spend bigint not null,
  revenue_attributed bigint not null,
  orders_attributed integer not null,
  new_customers integer not null,
  repeat_customers integer not null,
  status text not null,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, marketing_campaign_id)
);
alter table public.marketing_campaigns enable row level security;
create policy marketing_campaigns_read on public.marketing_campaigns for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','MARKETING','FINANCE']::text[]));
revoke all on public.marketing_campaigns from anon, authenticated;
grant select on public.marketing_campaigns to authenticated;

create table public.content (
  org_id uuid not null references public.organizations(id) on delete restrict,
  content_id text not null,
  marketing_campaign_id text,
  platform text not null,
  pillar text,
  format text,
  publish_date date,
  url text,
  reach integer not null,
  views integer not null,
  engagement integer not null,
  link_click integer not null,
  orders_attributed integer not null,
  revenue_attributed bigint not null,
  notes text,
  created_at timestamptz not null,
  created_by text not null,
  updated_at timestamptz not null,
  updated_by text not null,
  primary key (org_id, content_id)
);
alter table public.content enable row level security;
create policy content_read on public.content for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','ADMIN','MARKETING','FINANCE']::text[]));
revoke all on public.content from anon, authenticated;
grant select on public.content to authenticated;

create table public.daily_metrics (
  org_id uuid not null references public.organizations(id) on delete restrict,
  metric_date date not null,
  metric_key text not null,
  metric_value numeric(20,6) not null,
  unit text not null,
  calculated_at timestamptz not null,
  primary key (org_id, metric_date, metric_key)
);
alter table public.daily_metrics enable row level security;
create policy daily_metrics_read on public.daily_metrics for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.daily_metrics from anon, authenticated;
grant select on public.daily_metrics to authenticated;

create table public.monthly_metrics (
  org_id uuid not null references public.organizations(id) on delete restrict,
  month text not null,
  metric_key text not null,
  metric_value numeric(20,6) not null,
  unit text not null,
  calculated_at timestamptz not null,
  primary key (org_id, month, metric_key)
);
alter table public.monthly_metrics enable row level security;
create policy monthly_metrics_read on public.monthly_metrics for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.monthly_metrics from anon, authenticated;
grant select on public.monthly_metrics to authenticated;

create table public.activity_log (
  org_id uuid not null references public.organizations(id) on delete restrict,
  log_id text not null,
  timestamp timestamptz not null,
  user_id text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_json jsonb,
  after_json jsonb,
  source text not null,
  notes text,
  primary key (org_id, log_id)
);
alter table public.activity_log enable row level security;
create policy activity_log_read on public.activity_log for select to authenticated
  using (private.has_org_role(org_id, array['OWNER']::text[]));
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

-- Cross-table references are deferred to this second pass (cycles exist).
alter table public.customers add constraint fk_customers_favorite_product_id
  foreign key (org_id, favorite_product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.products add constraint fk_products_base_recipe_id
  foreign key (org_id, base_recipe_id) references public.recipes(org_id, recipe_id)
  deferrable initially deferred;
alter table public.products add constraint fk_products_default_packaging_id
  foreign key (org_id, default_packaging_id) references public.packaging(org_id, packaging_id)
  deferrable initially deferred;
alter table public.product_variants add constraint fk_product_variants_product_id
  foreign key (org_id, product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.product_variants add constraint fk_product_variants_recipe_id
  foreign key (org_id, recipe_id) references public.recipes(org_id, recipe_id)
  deferrable initially deferred;
alter table public.ingredients add constraint fk_ingredients_default_supplier_id
  foreign key (org_id, default_supplier_id) references public.suppliers(org_id, supplier_id)
  deferrable initially deferred;
alter table public.packaging add constraint fk_packaging_default_supplier_id
  foreign key (org_id, default_supplier_id) references public.suppliers(org_id, supplier_id)
  deferrable initially deferred;
alter table public.recipes add constraint fk_recipes_product_id
  foreign key (org_id, product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.recipes add constraint fk_recipes_variant_id
  foreign key (org_id, variant_id) references public.product_variants(org_id, variant_id)
  deferrable initially deferred;
alter table public.recipe_items add constraint fk_recipe_items_recipe_id
  foreign key (org_id, recipe_id) references public.recipes(org_id, recipe_id)
  deferrable initially deferred;
alter table public.orders add constraint fk_orders_customer_id
  foreign key (org_id, customer_id) references public.customers(org_id, customer_id)
  deferrable initially deferred;
alter table public.orders add constraint fk_orders_preorder_campaign_id
  foreign key (org_id, preorder_campaign_id) references public.preorder_campaigns(org_id, preorder_campaign_id)
  deferrable initially deferred;
alter table public.order_items add constraint fk_order_items_order_id
  foreign key (org_id, order_id) references public.orders(org_id, order_id)
  deferrable initially deferred;
alter table public.order_items add constraint fk_order_items_product_id
  foreign key (org_id, product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.order_items add constraint fk_order_items_variant_id
  foreign key (org_id, variant_id) references public.product_variants(org_id, variant_id)
  deferrable initially deferred;
alter table public.invoices add constraint fk_invoices_order_id
  foreign key (org_id, order_id) references public.orders(org_id, order_id)
  deferrable initially deferred;
alter table public.invoices add constraint fk_invoices_customer_id
  foreign key (org_id, customer_id) references public.customers(org_id, customer_id)
  deferrable initially deferred;
alter table public.payments add constraint fk_payments_invoice_id
  foreign key (org_id, invoice_id) references public.invoices(org_id, invoice_id)
  deferrable initially deferred;
alter table public.payments add constraint fk_payments_order_id
  foreign key (org_id, order_id) references public.orders(org_id, order_id)
  deferrable initially deferred;
alter table public.production_plan_items add constraint fk_production_plan_items_production_plan_id
  foreign key (org_id, production_plan_id) references public.production_plans(org_id, production_plan_id)
  deferrable initially deferred;
alter table public.production_plan_items add constraint fk_production_plan_items_product_id
  foreign key (org_id, product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.production_plan_items add constraint fk_production_plan_items_variant_id
  foreign key (org_id, variant_id) references public.product_variants(org_id, variant_id)
  deferrable initially deferred;
alter table public.production_plan_items add constraint fk_production_plan_items_recipe_id
  foreign key (org_id, recipe_id) references public.recipes(org_id, recipe_id)
  deferrable initially deferred;
alter table public.production_requirements add constraint fk_production_requirements_production_plan_id
  foreign key (org_id, production_plan_id) references public.production_plans(org_id, production_plan_id)
  deferrable initially deferred;
alter table public.production_requirements add constraint fk_production_requirements_plan_item_id
  foreign key (org_id, plan_item_id) references public.production_plan_items(org_id, plan_item_id)
  deferrable initially deferred;
alter table public.production_batches add constraint fk_production_batches_plan_item_id
  foreign key (org_id, plan_item_id) references public.production_plan_items(org_id, plan_item_id)
  deferrable initially deferred;
alter table public.production_batches add constraint fk_production_batches_product_id
  foreign key (org_id, product_id) references public.products(org_id, product_id)
  deferrable initially deferred;
alter table public.production_batches add constraint fk_production_batches_recipe_id
  foreign key (org_id, recipe_id) references public.recipes(org_id, recipe_id)
  deferrable initially deferred;
alter table public.production_batches add constraint fk_production_batches_pic_user_id
  foreign key (org_id, pic_user_id) references public.users(org_id, user_id)
  deferrable initially deferred;
alter table public.purchases add constraint fk_purchases_supplier_id
  foreign key (org_id, supplier_id) references public.suppliers(org_id, supplier_id)
  deferrable initially deferred;
alter table public.purchase_items add constraint fk_purchase_items_purchase_id
  foreign key (org_id, purchase_id) references public.purchases(org_id, purchase_id)
  deferrable initially deferred;
alter table public.content add constraint fk_content_marketing_campaign_id
  foreign key (org_id, marketing_campaign_id) references public.marketing_campaigns(org_id, marketing_campaign_id)
  deferrable initially deferred;

create unique index products_sku_org_uq on public.products(org_id, sku);
create unique index product_variants_sku_org_uq on public.product_variants(org_id, sku);
create unique index users_email_org_uq on public.users(org_id, email);
create unique index invoices_invoice_number_org_uq on public.invoices(org_id, invoice_number);
create unique index inventory_item_type_item_id_org_uq on public.inventory(org_id, item_type, item_id);
create unique index payments_reference_org_uq on public.payments(org_id, reference_no)
  where reference_no is not null and btrim(reference_no) <> '';
create unique index invoices_legacy_public_token_uq on public.invoices(public_token)
  where public_token is not null and btrim(public_token) <> '';
create unique index invoices_public_token_hash_uq on public.invoices(public_token_hash)
  where public_token_hash is not null;
create unique index invoices_one_active_per_order_uq on public.invoices(org_id, order_id)
  where status not in ('CANCELLED','REFUNDED');
create unique index transactions_payment_event_uq on public.transactions(org_id, reference_id)
  where reference_type = 'PAYMENT' and reference_id is not null;
create index idx_orders_customer_date on public.orders(org_id, customer_id, order_date desc);
create index idx_order_items_order on public.order_items(org_id, order_id);
create index idx_invoices_order on public.invoices(org_id, order_id);
create index idx_payments_invoice_at on public.payments(org_id, invoice_id, payment_at desc);
create index idx_movements_item_at on public.inventory_movements(org_id, item_type, item_id, movement_at desc);
create index idx_purchases_supplier_date on public.purchases(org_id, supplier_id, purchase_date desc);
create index idx_production_plan_date on public.production_plans(org_id, production_date desc);
create index idx_marketing_campaign_date on public.marketing_campaigns(org_id, start_date desc);
create index idx_activity_log_at on public.activity_log(org_id, timestamp desc);

alter table public.products add constraint chk_products_selling_price_nonnegative check (selling_price >= 0);
alter table public.products add constraint chk_products_current_cogs_nonnegative check (current_cogs >= 0);
alter table public.orders add constraint chk_orders_subtotal_nonnegative check (subtotal >= 0);
alter table public.orders add constraint chk_orders_discount_nonnegative check (discount >= 0);
alter table public.orders add constraint chk_orders_delivery_fee_nonnegative check (delivery_fee >= 0);
alter table public.orders add constraint chk_orders_tax_nonnegative check (tax >= 0);
alter table public.orders add constraint chk_orders_grand_total_nonnegative check (grand_total >= 0);
alter table public.order_items add constraint chk_order_items_unit_price_nonnegative check (unit_price >= 0);
alter table public.order_items add constraint chk_order_items_line_discount_nonnegative check (line_discount >= 0);
alter table public.order_items add constraint chk_order_items_line_total_nonnegative check (line_total >= 0);
alter table public.invoices add constraint chk_invoices_subtotal_nonnegative check (subtotal >= 0);
alter table public.invoices add constraint chk_invoices_discount_nonnegative check (discount >= 0);
alter table public.invoices add constraint chk_invoices_delivery_fee_nonnegative check (delivery_fee >= 0);
alter table public.invoices add constraint chk_invoices_tax_nonnegative check (tax >= 0);
alter table public.invoices add constraint chk_invoices_grand_total_nonnegative check (grand_total >= 0);
alter table public.invoices add constraint chk_invoices_paid_amount_nonnegative check (paid_amount >= 0);
alter table public.invoices add constraint chk_invoices_remaining_amount_nonnegative check (remaining_amount >= 0);
alter table public.payments add constraint chk_payments_amount_nonnegative check (amount >= 0);
alter table public.purchases add constraint chk_purchases_subtotal_nonnegative check (subtotal >= 0);
alter table public.purchases add constraint chk_purchases_delivery_cost_nonnegative check (delivery_cost >= 0);
alter table public.purchases add constraint chk_purchases_total_cost_nonnegative check (total_cost >= 0);
alter table public.purchase_items add constraint chk_purchase_items_unit_cost_nonnegative check (unit_cost >= 0);
alter table public.purchase_items add constraint chk_purchase_items_total_cost_nonnegative check (total_cost >= 0);
alter table public.expenses add constraint chk_expenses_amount_nonnegative check (amount >= 0);
alter table public.transactions add constraint chk_transactions_amount_in_nonnegative check (amount_in >= 0);
alter table public.transactions add constraint chk_transactions_amount_out_nonnegative check (amount_out >= 0);
alter table public.payments add constraint chk_payment_event_type
  check (status in ('SUCCESS','REFUND','FAILED'));
alter table public.invoices add constraint chk_invoice_has_public_token
  check (public_token is not null or public_token_hash is not null);
alter table public.orders add constraint chk_order_state
  check (order_status in ('DRAFT','WAITING_PAYMENT','CONFIRMED','SCHEDULED','IN_PRODUCTION','READY','ON_DELIVERY','COMPLETED','CANCELLED'));
alter table public.monthly_metrics add constraint chk_month_format check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
alter table public.payments add constraint chk_success_refund_positive check (status = 'FAILED' or amount > 0);
alter table public.order_items add constraint chk_order_item_quantity_positive check (quantity > 0);

create table public.business_id_counters (
  org_id uuid not null references public.organizations(id) on delete restrict,
  prefix text not null,
  period text not null,
  current_value bigint not null default 0 check (current_value >= 0),
  primary key (org_id,prefix,period)
);
alter table public.business_id_counters enable row level security;
revoke all on public.business_id_counters from anon, authenticated;
create table public.operation_idempotency (
  org_id uuid not null references public.organizations(id) on delete restrict,
  operation text not null,
  request_key text not null,
  payload_hash text not null,
  result_json jsonb,
  created_at timestamptz not null default now(),
  primary key (org_id,operation,request_key)
);
alter table public.operation_idempotency enable row level security;
revoke all on public.operation_idempotency from anon, authenticated;
create table public.outbox_jobs (
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
);
create index idx_outbox_next on public.outbox_jobs(state,next_attempt_at);
alter table public.outbox_jobs enable row level security;
revoke all on public.outbox_jobs from anon, authenticated;
create table public.payment_proofs (
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
);
alter table public.payment_proofs enable row level security;
create policy payment_proofs_read on public.payment_proofs for select to authenticated
  using (private.has_org_role(org_id, array['OWNER','FINANCE']::text[]));
revoke all on public.payment_proofs from anon, authenticated;
grant select on public.payment_proofs to authenticated;
-- CRITICAL: payment_proofs is metadata only; file upload/finalize is not atomic with SQL.
-- Implement server-side signed upload intent, validation, transaction and cleanup saga.
-- Implement atomic payment/refund/stock/preorder RPCs BEFORE enabling mutation routes.
commit;

