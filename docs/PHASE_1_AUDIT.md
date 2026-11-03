# Phase 1 — Source audit & foundation checkpoint

Date: 28 October 2026 (Asia/Jakarta). Scope: local analysis and isolated source only. No production changes.

## Verified inputs

1. `BUILD_PROMPT.md` — attached implementation handoff.
2. `Twolittle_Bites_v1.0.0_RC_QA_Hotfix_19_Fixed.zip` — attached Hotfix 19 Full source. SHA-256: `36e1526119baf00735923c7fd06ac7c073538781d86e66ca0cdd526b579a9279`.
3. Hotfix 19 contains 223 ZIP entries, `Schema.gs` with 33 canonical registries, `BASELINE_SHEET_SCHEMA.md`, `BASELINE_DATA_MODEL.md`, `BASELINE_DESIGN.md`, `BASELINE_PERMISSION_MATRIX.md`, `BASELINE_APP_ARCHITECTURE.md`, `BASELINE_CONVENTIONS.md`, source and QA notes.
4. Exact 12 concrete UI templates: Business, Customers, Executive, Finance, Inventory, Marketing, Orders, Production, Products, Purchasing, Reports, Settings. Hotfix README also says 13/13 *modules*; do not interpret this as a thirteenth Page*.html.
5. `DATA_MODEL.md` found separately for Twolittle.bites matches the 33-Sheet inventory. Other generic-named Library `README.md`, `PRD.md` and `DESIGN.md` belonged to unrelated projects and were **not** used.

## Important runtime contracts to preserve

- `OrderService.gs: TWB_ORDER_TRANSITIONS`: `DRAFT → WAITING_PAYMENT/CONFIRMED/CANCELLED`; `WAITING_PAYMENT → CONFIRMED/CANCELLED`; `CONFIRMED → SCHEDULED/IN_PRODUCTION/CANCELLED`; `SCHEDULED → IN_PRODUCTION/CANCELLED`; `IN_PRODUCTION → READY/CANCELLED`; `READY → ON_DELIVERY/COMPLETED/CANCELLED`; `ON_DELIVERY → COMPLETED/CANCELLED`. COMPLETED/CANCELLED are terminal.
- `OrderService.gs`: bulk progress guard is 100 orders and must check allowed targets server-side.
- `PaymentService.gs` Hotfix 19: payment/refund references are idempotent *only for exact matching fields*; conflicting references fail. Refund available balance checked inside critical section. `AUTO_CONFIRM_ON_PAID` controls order auto-confirm; do not blindly confirm every payment.
- `PaymentProofService.gs`: max 8 MiB, JPEG/PNG/WebP/PDF magic bytes, Jakarta date + canonical customer name + payment ID. Proof files remain private; Hotfix 19's sharing policy for authorized Drive viewers still requires live owner validation.
- `InventoryService.gs`: `NEGATIVE_STOCK_ALLOWED` config is authoritative. Movement ledger is canonical; balance is a cache. `PRODUCTION_REQUIREMENTS` and `ORDER_ITEMS` preserve historical snapshots.
- Invoice PDF links can be public while payment *proofs* must never be public; separate trust boundaries in Supabase Storage.

## Ambiguities and unsafe assumptions — decision required

| Priority | Finding | Safe decision for now |
| --- | --- | --- |
| P0 | `BASELINE_SHEET_SCHEMA.md` and `BASELINE_CONVENTIONS.md` describe payment event statuses `PENDING/VERIFIED/FAILED/REFUNDED`, while Hotfix 19 `PaymentService.gs` records `SUCCESS/REFUND`. | Runtime behavior takes precedence provisionally; require an explicit migration mapping and tests before table DDL. |
| P0 | The 33-sheet data *schema* is in the ZIP, but 33 exported canonical Sheets and proof/PDF file exports are absent. | Do not synthesize rows or claim migration completed. |
| P0 | No Supabase DEV project URL/reference confirmed. Existing remote target must never be inferred. | Refuse remote migration and login until explicit DEV target configuration. |
| P0 | Required Supabase-specific `SECURITY.md`, `API_CONTRACT.md`, `MIGRATION.md` not present. Legacy permission matrix uses `USERS.user_id` + email and five roles; Supabase Auth uses UUID subjects. | Do not guess auth identity binding or RLS policies. Deny all business access until policy design is reviewed. |
| P0 | Hotfix 19 uses Apps Script `LockService` plus multiple Sheets writes. This is not PostgreSQL atomicity; it can leave partial mutations. | Implement one transactional RPC per payment/refund/stock/purchase/production/preorder action later; prove concurrency behavior before UI. |
| P1 | 13/13 functional modules vs 12 `Page*.html` templates; exact React route taxonomy undocumented. | Preserve 12 template references; derive route mapping from the missing PRD/workflows before implementing pages. |
| P1 | Hotfix 19 notes an accompanying *separate* Localhost Hybrid package with `server.mjs`/`vite.config.mjs`, absent from this Full ZIP. | Do not assume the embedded/local proxy code is fully delivered or suited to Supabase. |
| P1 | Exact 13 business domains vs legacy model grouping needs target-domain mapping. | Use canonical table inventory; no invented modules/routes. |
| P1 | Rebuild-specific PRD, DESIGN, WORKFLOWS, QA_TEST_PLAN are not attached. Hotfix `BASELINE_*` and QA notes are useful references, but not full new-app contracts. | Hold full RLS, schema, transactional RPC, migration and parity signoff. |

## Completed in this checkpoint

- Isolated React + TypeScript + Vite repo skeleton.
- Branded Indonesian DEV login shell with token palette `#DE5D3D`, `#F6F6D2`, `#FDD3D7`, `#9E3B26`, Gaegu and Poppins.
- Supabase client factory using **publishable key only** and explicit matching DEV reference; fail-closed if unset/mismatched.
- Auth service separated from UI; no business read/write service yet.
- Source inventory of 33 Sheets and 12 page templates with tests.
- No-op foundation migration, test scaffolding, static secret audit.

## Verification and known gaps

- Unit/config tests: see `npm run check` output at handoff.
- No real Supabase connection, RLS evaluation, transactional concurrency test, migration of Sheets/files or screenshot-parity tests performed.
- UI is a clearly marked staging shell, **not** the 12-page parity rebuild.

## Phase 2 entry gate (explicit approval needed)

1. Supply missing Twolittle.bites rebuild contracts and all 33 canonical Sheet exports; attach file exports separately.
2. Confirm the exact newly created Supabase DEV/staging project reference; confirm which users can receive OWNER/FINANCE roles.
3. Sign off enum mapping, public invoice token behavior, private proof access policy, role identity/RLS model, and no destructive migration strategy.
4. Then implement and test SQL schema/RLS and transactional RPCs locally/DEV before any UI feature parity work.
