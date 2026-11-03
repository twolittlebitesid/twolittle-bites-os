# Phase 1 Blueprint Update — SQL prepared, not deployed

**Date:** 28 October 2026 (Asia/Jakarta). **Status:** static checkpoint; cloud database and business data untouched.

## New source received

`Twolittle_Bites_Supabase_Rebuild_Blueprint_v1.0_2026-10-28(1).zip` contains all nine formerly missing core specifications, architecture, implementation plan, decision log, a 33-table SQL starter, private proof bucket migration, a machine-readable legacy schema manifest, 108 legacy API actions, and the exact Hotfix 19 source snapshot.

The embedded Hotfix 19 source ZIP SHA-256 (`36e1526119baf00735923c7fd06ac7c073538781d86e66ca0cdd526b579a9279`) matches the directly attached Hotfix 19 archive. Generator verification reported **33 tables, 452 legacy columns and 108 gateway actions**.

## Prepared foundation

- `supabase/migrations/202610280001_initial_schema.sql`: 33 legacy business tables plus supporting org/member/idempotency/outbox/proof metadata tables; composite org-scoped keys/FKs; read-only client RLS; no client DML. **Not applied.**
- `supabase/migrations/202610280002_storage.sql`: `payment-proofs` private bucket with size/MIME restrictions and OWNER/FINANCE READY-object read policy. No direct browser write policies. **Not applied.**
- `specs/`: source blueprint stored unchanged, including code generator and Hotfix snapshot.
- `src/domain/orderTransitions.ts`: exact allowed order graph and limited UI bulk preflight (not a substitute for RPC validation).
- Static tests compare all 33 table definitions against all 452 fields, enforce RLS/grant presence, role-sensitive payment/proof guards, and check migration filename uniqueness.

## Open correctness/security decisions before executing SQL

| Severity | Area | Required verification/change |
| --- | --- | --- |
| P0 | DEV project target | Confirm that the project is new/isolated and its exact reference. A config variable named DEV does not prove a URL is non-production. Do not push to any existing remote automatically. |
| P0 | PostgreSQL runtime | This environment has no `psql`, Supabase CLI or Docker. The supplied SQL has **not** been parsed/applied by PostgreSQL; run fresh-DB migrations, RLS negative tests and rollback drill in isolated DEV before approval. |
| P0 | Business writes | All 33 tables are read-only to browser, but no payment/refund/order/stock/purchase/preorder RPCs or Edge authorizers exist. Do not expose direct client DML or service-role shortcuts. |
| P0 | Auth bootstrap | `memberships` links `auth.users.id`; legacy `public.users.user_id` is a separate text business identity. OWNER invite/bootstrap and verified mapping must be implemented and tested, not inferred from email alone. |
| P0 | Cross-table integrity | `payments.invoice_id` and `payments.order_id` each have FKs, but no constraint proves that invoice belongs to that order. Likewise `order_items.variant_id` vs `product_id`, and production requirement `plan_item_id` vs `production_plan_id`. Enforce consistency transactionally/with composite relations before enabling writes. |
| P0 | Permission projections | SQL intentionally excludes MARKETING and PRODUCTION from several full-table reads (customers, products, inventory). Role-scoped limited DTO endpoints/views are **not yet implemented**; do not relax RLS to make UI display data. |
| P0 | Payment proof saga | `payment_proofs` references an existing payment, while the workflow stages a private file before payment commit. Define temporary upload-intent ownership, expiry, idempotency and orphan cleanup. An 8 MiB MIME check alone is not magic-byte validation. |
| P1 | Product costs | ADMIN full-table `products`/ingredients reads include cost/margin fields. Confirm intended access before production use; customer/production limited projections are distinct. |
| P1 | Historical import | 33 real CSV/JSON exports, actual proof/PDF bytes, Auth identities and source reconciliation are missing. Do not generate synthetic production rows or claim import readiness. |
| P1 | Storage & public invoice | Only `payment-proofs` bucket is created. Invoice PDFs, token hashing/rotation endpoint, MIME signature validation, output rate limit and printing are specified, not implemented. |
| P1 | Idempotency normalization | Unique partial index on `(org_id,reference_no)` is case-sensitive. Server must normalize references consistently and compare full payload/proof identity before returning `already_recorded`. |

## Verification evidence

- Blueprint generator verifier: **PASS** — 33 / 452 / 108.
- `npm run check`: **17/17 unit/static tests PASS; TypeScript and Vite build PASS; credential and unsafe-DML static audit PASS.**
- Migrations: **prepared, not executed**. No live RLS or concurrency conclusion.
- No remote project, deployed Edge functions, migration of real Sheets/Drive files, screenshot baseline or UAT performed.

## Next approval gate

Confirm newly created Supabase DEV project, payment-proof access policy and the intended role/identity mapping. With an explicit next-phase go-ahead, implement transactional domain RPCs and policy tests, then run the prepared schema on isolated DEV with a reproducible import/UAT report. Keep legacy GAS/Sheets authoritative until migration sign-off.
