# MIGRATION — Google Sheets/Drive → Supabase

**Principle:** migrate on DEV/STAGING first. Original Sheets/Drive remain untouched and authoritative until signed-off cutover. Do **not** use dual-write without a designed outbox/reconciliation plan.

## 1. Inputs that must be collected

1. Verified **snapshot** of all **33 canonical Sheets** including row 1 headers, content, locale/timezone, formulas vs cached values, and exported UTF-8 CSV/JSON. Avoid manually editing source.
2. Google Drive object inventory: invoice PDF IDs/links and payment-proof objects; metadata (mime, bytes, ownership, access) and permitted authorized export. Never make payment proofs public.
3. Config/business settings, invoice token policy, WA template, linked logo/product images, receipt printing settings.
4. Mapping legacy `USERS.user_id`/emails to new `auth.users.id` and role memberships; invite users rather than importing passwords.
5. Current source of truth: order/status, event payments, financial transactions, inventory movements, production snapshots, selected reporting date/close.
6. Authoritative latest version of Apps Script/localhost code (Hotfix 19 source included here) plus release/QA reports.

## 2. Preflight

- Choose **new DEV Supabase project** or confirm a clean, isolated namespace. Historical context suggests another Supabase project may already have marketing/content migrations: never assume it is safe to reuse.
- Record source count/hash per Sheet; inspect duplicate IDs, duplicate payment `reference_no`, broken foreign references, null required fields, date ambiguities, negatives, cyclic references.
- Export validated copy of source data with read-only credentials; mask real customer/payment data in developer fixtures.
- Document whether historical proof files stay in Drive during first cutover or are copied to private Storage with correct permissions.

## 3. Migration order (two-pass FKs)

1. `organizations`, `memberships`, `users`, `config`, `business_settings`.
2. Master `suppliers`, `ingredients`, `packaging`, `unit_conversions`, `customers`, `products`, `product_variants`, `recipes`, `recipe_items`.
3. Preorder campaigns, marketing campaigns, content, business targets.
4. Orders → order items → invoices → payments → transactions → expenses.
5. Production plans → plan items → requirements → batches.
6. Purchases → purchase items; inventory movements → rebuild inventory projection.
7. Activity log, daily/monthly metrics (prefer rebuild) and customer/marketing aggregates.
8. File metadata migration: payment proof objects to private bucket, PDFs/logo/product media according to their policies.

References that form cycles (products→recipes, ingredients→suppliers, etc.) require initial nullable references/deferrable constraints or deferred second pass. The scaffold SQL uses two-pass FK creation; import inside a transaction with deferred constraints where appropriate.

## 4. Transformation rules

| Raw source | Transform | Validation |
|---|---|---|
| Blank cell | `NULL` or explicit default from column contract | Never coerce required blank into fake zero without rule |
| `Rp 150.000` | `150000` bigint | Currency nonnegative where required |
| `2026-10-28T13:00:00+07:00` | UTC `timestamptz` | Preserve same instant |
| `2026-10-28` | `date` | No timezone shifting |
| `TRUE`/`FALSE` | boolean | Reject inconsistent tokens |
| `USERS.user_id` | preserve text + link verified `auth_user_id` | Duplicate emails/email changes reviewed |
| Legacy `proof_url` | retain historical URL + optional new `payment_proofs.object_path` | Strict private access before publishing |
| `current_stock_base` | recompute from movements, compare old cache | Differences investigated, not hidden |
| `paid_amount`, `remaining_amount` | recompute from payment events, compare old cache | Investigate missing/refund/failed events |
| `DAILY/MONTHLY_METRICS` | recompute caches | Composite keys rather than date-only uniqueness |

## 5. Reconciliation report (every import)

```text
Sheet/table: source_count, imported_count, rejected_count, duplicate_keys
Money: invoice_grand_total_sum; success_amount_sum; refund_amount_sum;
       net_paid_sum; transactions_in/out_sum; expenses_sum
Inventory: per item total movements IN-OUT vs current_stock_base
Orders: by status/payment_status; order_item totals vs order header totals
Production: plan/batch/requirement counts and recipe version refs
Marketing: attributed order links and spend totals
Files: listed/migrated/missing/private-access-test
Auth: user count, verified mapping, OWNER active
```

Migration **fails** on unresolved duplicate key, cross-org references, or monetary/stock mismatch above **zero** on exact integer ledgers (unless an approved adjustment event is documented). Cache mismatches can be corrected only by documented rebuild with before/after report.

## 6. Cutover rehearsal

1. Restore a source snapshot into staging; import to fresh DB using repeatable scripts.
2. Run all role/RLS, full workflow, concurrent mutation, mobile visual tests; verify file access as OWNER and FINANCE.
3. Establish write-freeze window on legacy system; take final backup and delta since rehearsal.
4. Import final delta, reconcile, switch app origin **only after GO**. Keep old GAS read-only/rollback route.
5. Watch error logs, balance mismatches, missing images, WA links, PDF, print and proof retrieval.
6. Rollback: route users back to legacy if no new writes or after controlled reconciliation. **Do not reverse new financial writes silently**; stop and execute explicit resolution plan.

## 7. Required migration artifacts not included yet

Real CSV/JSON exports of 33 sheets, actual Drive file bytes/permissions, real Supabase Auth user IDs, secrets, tenant/project identifiers, runtime domain, live screenshots and proof of backup/restore. These must be supplied by authorized owner or collected during a separate permissioned execution.
