# DECISIONS_AND_GAPS — Explicit Open Items

The following are **not assumed** and require owner/developer sign-off. Their absence does not prevent producing this blueprint but does block live migration/release.

| ID | Question | Default in blueprint | Impact |
|---|---|---|---|
| D-01 | New Supabase project or existing? | New isolated DEV; no remote writes | Avoid collisions with prior migrations/schema |
| D-02 | One brand vs future multiple brands? | `organizations` + org-scoped rows | Secure growth; slightly more schema work |
| D-03 | Auth login mode/verification? | Supabase Auth staff invites, verified identities | User mapping and access |
| D-04 | Access to payment proofs? | OWNER + FINANCE only, private bucket | Security/RLS/Storage |
| D-05 | Invoice PDF public access? | Token-limited endpoint, not permanent public file | Existing Drive URL migration |
| D-06 | Legacy 33-sheet export & Drive file access? | Not provided; require authorized export | Actual data migration |
| D-07 | Existing legacy invoice public tokens? | Rotate on cutover unless verified | External customers' saved links |
| D-08 | Data cleanup policy for bad historical rows? | Quarantine + manual approval | Data consistency |
| D-09 | Sales tax/rounding interpretation? | Preserve legacy integer order snapshot | Invoice parity |
| D-10 | Hosting URL, print device environment, file retention? | TBD after prototype | Deployment/operations |
| D-11 | Scope of historical marketing data vs any separate content OS? | Import only Twolittle.bites OS 33-sheet content | Avoid joining unrelated projects |
| D-12 | Historical GAS app write-freeze window? | Explicit planned cutover | Prevent divergent financial ledgers |

## Key technical blockers after blueprint

1. No Supabase project credentials/DB connection verified or mutated in this work.
2. No production rows, Drive file bytes, or permissions imported.
3. SQL migrations have not been applied or exercised against a real PostgreSQL/Supabase environment; starter code must pass local database test gate.
4. Edge business functions (payments, stock, preorder, public invoices, file saga) are **specified but not yet implemented**. Do not expose raw table DML to browser as a shortcut.
5. Long-lived generated views, queue/retry infrastructure and migration scripts need implementation in the application repo.
