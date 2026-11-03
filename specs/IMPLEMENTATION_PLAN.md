# IMPLEMENTATION_PLAN — Build Order

This is a **recommended** phased implementation sequence, not a live project status.

| Phase | Deliverable | Exit gate |
|---|---|---|
| 0. Baseline | Inventory legacy 12 pages/13 domains/108 actions/33 sheets; screenshots; resolve decisions | Approved source-of-truth matrix |
| 1. Foundation | Repo React TS, responsive shell & tokens, Supabase project DEV, Auth, org/member RLS, CI | Five test roles, no cross-org access |
| 2. Catalog | Products/variants, ingredients/packaging, suppliers, recipes/BOM, calculator, unit conversion | Recipe EXACT/FULL_BATCH, COGS precision |
| 3. Commerce | Customers, preorders, orders, status/bulk, snapshots, public invoice/WA | Atomic capacity and order graph |
| 4. Payments | Invoices, partial/full payment, refund, proof upload, receipt/PDF | Lock/idempotency/private Storage tests |
| 5. Operations | Production planning, batches, stock movement/adjustments, purchasing/receiving | No double stock posting, negative-stock guard |
| 6. Insights | Finance/P&L, Marketing attribution, CRM, Executive, Business, Reports | Shared totals reconcile |
| 7. Governance | Settings, users/roles, print, audit, diagnostics, backup/release workflows | Role UAT, restore drill |
| 8. Migration | Staging import of 33 sheets + Drive objects, reconciliation, final delta | 0 unresolved blockers |
| 9. Launch | Visual parity, full functional regression, rollback rehearsal, controlled cutover | Explicit owner GO |

## Implementation task principles

1. Build database domain invariants before dashboards. Never make reports the source of truth.
2. Add automated test for every protected write and each role before enabling UI action.
3. Use append-only ledgers, outbox for external side effects, immutable snapshots.
4. Match legacy UI layout and labels before cosmetic enhancements.
5. No direct service-role secrets in browser; do not disable RLS to “fix” development errors.
6. Ensure migrations are reviewed/repeatable, no direct production SQL changes or destructive resets.
7. Use feature flags for cutover and stage one domain only after its contracts and downstream reconciliations pass.

## Suggested milestones

- **M1:** Auth/RLS + full master catalog.
- **M2:** Order→invoice→payment/proof end-to-end.
- **M3:** Purchasing→inventory→production and cash/COGS consistency.
- **M4:** Marketing/CRM/reporting visual parity.
- **M5:** Full import, UAT, cutover.

Estimates must be set by the implementer after evaluating current live data quality and design screenshots; no fixed development dates are implied.
