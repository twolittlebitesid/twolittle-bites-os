# Changelog

## 0.1.0-dev blueprint supplement — 2026-10-28

- Incorporated the full Supabase Rebuild Blueprint v1.0 and its exact Hotfix 19 source snapshot.
- Replaced the Phase 1 no-op SQL placeholder with **unapplied** starter 33-table/RLS migration and private proof Storage migration.
- Added the exact order transition graph and 100-order UI preflight utility.
- Added schema source crosswalk tests (33 tables / 452 fields), RLS/grant/static Storage assertions.
- Recorded high-priority Auth, FK consistency, role projections, proof saga and migration runtime gaps.
- No Supabase connection, migration execution, production write, or schema push.

## 0.1.0-dev — 2026-10-28

- Added isolated Vite, React, TypeScript and Supabase JS project skeleton.
- Added fail-closed DEV target environment parsing and publishable-key-only client.
- Added Indonesian Supabase Auth login shell and brand token CSS.
- Captured all 33 canonical Sheet identifiers and 12 legacy page-template names from Hotfix 19.
- Added no-op DEV migration checkpoint (no business tables, no RLS assumptions).
- Added configuration, inventory and static secret scan tests.
- Audited Hotfix 19 finance/proof/source semantics and recorded unresolved target-contract issues.
- No production data, user account, database, storage or deployment touched.
