# QA_TEST_PLAN — Supabase Edition

## 1. Automated test levels

| Layer | Tool suggestion | Gate |
|---|---|---|
| Static | `tsc`, ESLint, migration lint | 0 compilation errors |
| DB | fresh Supabase local DB, pgTAP/SQL assertions | constraints, FK, indexes, RLS pass |
| Domain | Vitest + integration Postgres RPC | atomicity, rounding, state transitions |
| Edge | integration with signed-in test users | role, DTO masking, idempotency |
| E2E | Playwright 1440px/tablet/mobile | 13 domains and 12 pages |
| Visual | baseline screenshots vs current UI | no unauthorized redesign |
| Migration | source row hashes + reconciliation | zero unexplained mismatch |
| Security | negative RLS/Storage tests | zero cross-tenant/role leakage |

## 2. Critical test inventory

| ID | Scenario | Expected |
|---|---|---|
| QA-001 | Unauthenticated business table read | Denied |
| QA-002 | MARKETING requests full customer with private notes | Redacted/denied; only CRM DTO |
| QA-003 | PRODUCTION reads Finance/P&L/proof object | Denied |
| QA-004 | FINANCE creates valid partial payment | 1 payment + 1 transaction, invoice PARTIAL |
| QA-005 | Another successful payment fully settles | invoice PAID, last method latest, order auto-confirm per setting |
| QA-006 | Duplicate same-reference exact retry | Same original payment, no new ledger rows |
| QA-007 | Same reference with changed amount/method/invoice/proof | 409 conflict |
| QA-008 | Two concurrent refunds exceed net paid | Only permitted refund commits; no negative paid balance |
| QA-009 | Refund exact retry | Idempotent, no duplicate cash-out |
| QA-010 | Upload JPG/PNG/WebP/PDF at ~0.5/1/2/8 MiB | Accepted with correct signature, private, correct filename |
| QA-011 | >8 MiB, spoofed extension or malformed magic bytes | Rejected, no linked public file |
| QA-012 | Private proof link other user/anonymous | Cannot fetch, list, or sign |
| QA-013 | Create Order snapshots + later product price update | Old price unchanged |
| QA-014 | Order status invalid transition / terminal | Rejected |
| QA-015 | Bulk progress 100 vs 101 / mixed invalid target | 100 valid; 101 rejected; invalid preflight no writes |
| QA-016 | Preorder cutoff or capacity with concurrency | No overbooking, override audited |
| QA-017 | Recipe scaling EXACT/FULL_BATCH with unit conversion | Correct precision and surplus |
| QA-018 | Production usage posted twice | First movement only |
| QA-019 | Purchase partial receive retried | No duplicate stock/cost, quantities correct |
| QA-020 | Physical count adjustment | Delta movement created; inventory from ledger |
| QA-021 | Negative stock setting off | Outbound movement blocked |
| QA-022 | Public invoice token wrong/expired/rotated | 404/denied, no internal detail |
| QA-023 | Public invoice/pdf/WA deep link | Correct totals/delivery fee, no proof leak |
| QA-024 | Receipt 58/80 + kitchen ticket | Browser print layout, correct role |
| QA-025 | Revenue/P&L/net cash/attribution reports | Equal to authoritative ledgers |
| QA-026 | Migration 33 tables/keys/files | Counts, FKs, money, inventory reconcile |
| QA-027 | Cross-org business key collision | No cross-org access or FK |
| QA-028 | Retired user/auth revocation | All read/write/private files denied |
| QA-029 | Responsive UI and drawer/modal/table | 12 pages without overflow |
| QA-030 | Connection timeout after committed payment | Retry returns original ID, UI no duplicate |

## 3. Functional UAT script

Start with **synthetic** customer/product/ingredient/supplier. Create recipe, stock, campaign/preorder, new order, invoice, partial QRIS+final BCA payment with proofs, production plan, purchase if shortage, batch, fulfill, completed status; check Report/Marketing/CRM/Finance. Repeat with cancellation/refund and a second order for bulk status. Check 5 user roles and private/public browser. Never test with live money without explicit owner authorization.

## 4. Performance / reliability

Use anonymized copy resembling actual 33-table volume. Concurrent test at least 20 payment retry requests on one reference; 10 refunds on one invoice; 10 stock usage attempts; 10 preorder reservations for last slot. Simulate request timeout after commit, S3/Storage transient failure, PDF job failure, expired session, and stale cache.

## 5. Go / no-go checklist

- [ ] Source export and final delta reconciled; 33/33 mapped.
- [ ] Database integrity & RLS/Storage deny tests green.
- [ ] Feature regression 13/13, all 12 pages visually signed-off.
- [ ] Concurrency/payment/refund/stock/preorder tests green.
- [ ] Real 8 MiB upload and authorized proof view tested in deployed staging.
- [ ] Invoice public access cannot leak payment proof or admin data.
- [ ] Backup/restore drill and rollback plan approved.
- [ ] Owner, Finance, Production, Marketing, Admin all complete role UAT.
- [ ] Release lead signs GO, otherwise no cutover.
