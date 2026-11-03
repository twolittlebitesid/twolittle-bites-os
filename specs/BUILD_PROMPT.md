# BUILD_PROMPT — Hand-off to Developer/Coding Agent

You are implementing **Twolittle.bites OS Supabase Edition**, a full feature-parity rebuild of the existing dessert-business operations app. Use files in this package as specification; inspect the supplied Hotfix 19 source archive as functional and visual reference. Do not treat generic ERP assumptions as requirements.

## Hard constraints

1. Preserve **all 33 legacy tables** as mapped, 13 business domains and 12 page layouts; implement Indonesian UI and brand tokens `#DE5D3D`, `#F6F6D2`, `#FDD3D7`, `#9E3B26`, Gaegu + Poppins. Visual parity before redesign.
2. Supabase PostgreSQL/Auth/RLS/Storage is backend. Build React + TypeScript frontend with modular services. No service-role secret in browser, no RLS-disable workaround.
3. Implement read separation and **transactional writes** for payment/refund, stock, purchasing, production usage, preorder booking. Keep stable business IDs and immutable historical snapshots.
4. Private proof upload JPG/PNG/WebP/PDF ≤8 MiB with file signature verification, filename by Jakarta payment date + customer + payment ID, authorized link only; never public proof bucket.
5. Copy exact order transition graph, auto-confirm setting, idempotent payments/refunds, negative-stock config, pre-order cutoff and capacity, 100-order bulk guard.
6. WhatsApp opens manual deep link; browser receipt printing 58/80mm; public invoice token endpoint; managerial P&L only.
7. Implement migration from **33 canonical Sheets** and proof/PDF files separately. Do not invent source production data.
8. Use separate DEV/staging project; **never push to existing remote Supabase without explicit target confirmation**.

## Implement in small, tested iterations

- Read `README.md`, `PRD.md`, `DESIGN.md`, `DATA_MODEL.md`, `SECURITY.md`, `WORKFLOWS.md`, `API_CONTRACT.md`, `MIGRATION.md`, `QA_TEST_PLAN.md` first.
- Create repo skeleton, migration scripts, Auth/RLS, type generation, functions and frontend; run tests at each checkpoint.
- Preserve source of truth: `payments`, `inventory_movements`, `transactions`, order-price snapshots and production requirements.
- For risky write RPCs, prove concurrency behavior with integration tests before UI integration.
- Build full baseline screenshots and compare each page at desktop/tablet/mobile; document parity differences.
- Final output for each phase: source files, migration, tests, changelog, known gaps, and explicit request for next-phase approval.

**First task:** inspect the Hotfix 19 source and database scaffold, report any ambiguous references or unsafe starter assumptions, then implement Phase 1 foundation in a new DEV repo without production changes.
