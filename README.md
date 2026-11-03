# Twolittle.bites OS — Supabase DEV Foundation

Status: **Phase 1 source/DDL foundation prepared, not applied** (28 Oktober 2026).

This is an isolated React + TypeScript + Supabase **development-only** starter. It is not a functional replacement for the Hotfix 19 operational app yet. The complete Supabase Rebuild Blueprint v1.0 has now been incorporated under `specs/`; the generated schema and private proof Storage migrations are prepared under `supabase/migrations/` but **have not been run**. No production Sheets, Drive files, or Supabase project have been read, written, migrated, or deployed.

## Start locally

```bash
npm install
npm run check
npm run dev
```

Without environment values, the app deliberately shows an unconfigured state. Create a **new, independently confirmed Supabase DEV project** before setting `.env.local` from `.env.example`. Never use a service-role or secret key in Vite variables. The app requires a publishable key and the explicitly matching DEV project reference.

The login proof-of-concept uses Supabase Auth `signInWithPassword`. No business tables or RPCs are exposed yet. Before any schema deployment, review [the initial audit](docs/PHASE_1_AUDIT.md) and [the blueprint update](docs/PHASE_1_BLUEPRINT_UPDATE.md). The latter contains mandatory security and relationship gates.

## Structure

- `src/lib/config.ts`: fail-closed DEV project validation.
- `src/lib/supabase/client.ts`: client-side Supabase setup, publishable key only.
- `src/services/auth.ts`: isolated auth service.
- `src/domain/catalog.ts`: exact 33 Sheet + 12 page source inventory.
- `src/domain/orderTransitions.ts`: exact Hotfix 19 order status graph and 100-order UI preflight (server enforcement still required).
- `src/styles.css`: brand token foundation, Gaegu / Poppins.
- `supabase/migrations/`: generated 33-table SQL plus private proof Storage policy. **Unapplied, review required**.
- `specs/`: complete supplied blueprint docs, source manifest, and Hotfix 19 archive snapshot.
- `docs/PHASE_1_AUDIT.md` and `docs/PHASE_1_BLUEPRINT_UPDATE.md`: audit, gates, known issues.

## Important boundaries

1. **No remote DB migration** without the exact approved DEV project target and SQL review. Do not run `supabase db push` on an existing project.
2. Generated SQL is an *unapplied starter*; legacy types and missing cross-table invariants require review. No verified Auth-user mapping or transactional RPC exists yet.
3. No demonstration records created; production data must come from independently exported canonical Sheets.
4. No business writes from browser. Later payment/stock/preorder/production flows must use tested, single-transaction server functions.
5. Do not mistake this login shell for feature-parity UI. Static test success is not a substitute for PostgreSQL migration/RLS tests.

## Next checkpoint

Blueprint specifications are supplied and verified. Next: confirm the exact newly created Supabase DEV project reference (and explicit schema-review approval), resolve items in `docs/PHASE_1_BLUEPRINT_UPDATE.md`, implement/verify transactional RPCs and limited role projections, then run schema/RLS integration tests against isolated local/DEV Postgres. Real 33-sheet CSV and Drive file exports remain missing.
