# REFERENCE_SOURCES — Authoritative inputs

The blueprint was created against this concrete code baseline:

`Twolittle_Bites_v1.0.0_RC_QA_Hotfix_19_Fixed.zip` (28 Oct 2026, code-level release candidate).

Included original source snapshot: `reference/Twolittle_Bites_Hotfix19_Source.zip`.

Most important source files inside:

- `BASELINE_SHEET_SCHEMA.md`: exact legacy fields for 33 Sheets.
- `BASELINE_DATA_MODEL.md`: domain relationships, event & snapshot distinction.
- `BASELINE_PERMISSION_MATRIX.md` and `Permissions.gs`: five roles, permission keys.
- `BASELINE_DESIGN.md`, `StylesTokens.html`, `StylesBase.html`, `StylesComponents.html`, `StylesResponsive.html`, `StylesExperience.html`: UI reference.
- `Page*.html`, `Js*.html`, `Index.html`: real page structure and behavior.
- `ApiGateway.gs`: 108 named actions, listed in `reference/LEGACY_API_ACTIONS.md`.
- `Constants.gs`: status, default config and ID conventions.
- `OrderService.gs`: exact order status graph and bulk progress.
- `PreorderService.gs`: cutoff/capacity calculations.
- `PaymentService.gs`, `PaymentProofService.gs`: partial/refund, locking/idempotency, proof.
- `InventoryService.gs`, `PurchasingService.gs`, `ProductionPlanningService.gs`, `ProductionReleaseService.gs`: ledger and production operations.
- `QA_HOTFIX_17_BULK_ORDER_PROGRESS.md`, `QA_HOTFIX_18_PAYMENT_PROOF_UPLOAD.md`, `QA_HOTFIX_19_FINANCE_HARDENING.md`: last changes.
- `PRODUCTION_ACCEPTANCE_TEST.md`, `OPERATOR_GUIDE.md`: functional test flows and operator practices.

Official current-platform references (verify features against SDK versions at implementation time):

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase private buckets / signed URLs](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Edge Function Auth](https://supabase.com/docs/guides/functions/auth)
- [Supabase CLI / local development](https://supabase.com/docs/guides/local-development/cli/getting-started)

Do not confuse the separate content/marketing-oriented Supabase schema from prior work with this 33-table dessert operations schema. Project selection must be explicit.
