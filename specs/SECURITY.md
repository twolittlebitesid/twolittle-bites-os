# SECURITY — Auth, RLS, Permissions, Storage

## 1. Authorization policy

Supabase Auth identifies account; `public.memberships` maps `(org_id, auth.uid())` to role. Role **must come from database**, never client-supplied JWT user metadata, request JSON, URL query, or hidden button. Inactive/revoked member must lose access on subsequent request.

| Area | OWNER | ADMIN | PRODUCTION | MARKETING | FINANCE |
|---|---|---|---|---|---|
| Users/roles/release | full | diagnostics limited | — | — | settings read only |
| Orders/preorder | full | full | status/operational read | limited order read | read |
| Products/recipes | full | full | recipe/stock ops (no margin) | product preview only | read |
| Customers | full | full | limited | CRM projection only | read |
| Invoice/payment proof | full | invoice/payment create limited | — | — | full incl. refund/proof |
| Production/inventory | full | full | operational write | — | read |
| Purchase/supplier | full | full | read operational | — | read |
| Expense/transaction/P&L | full | expenses create limited | — | marketing expenses only | full |
| Marketing | full | read | — | full | read |
| Reports | full | non-profit summary | operational | marketing | full |

The exact legacy permission keys are in `reference/LEGACY_PERMISSION_MATRIX.md` and `Permissions.gs` in the source archive. The matrix above intentionally separates **limited projections** from full table reads.

## 2. RLS model

- Every business row includes `org_id`. Policies check membership in same org; no cross-org data even when IDs match.
- `SELECT` is explicitly granted only to authenticated users + RLS policies; sensitive full tables (payment, transaction, P&L) allow OWNER/FINANCE only.
- For **customer/marketing/production limited views**, use Edge endpoints returning a fixed DTO; never hand Marketing a table query that includes confidential notes or payment evidence. With multi-tenant scale, create `security_invoker` views and field grants after tests.
- Starter SQL intentionally provides **NO direct client DML** for 33 business tables. Mutations through validated, authorized Edge endpoints + narrow transactional PostgreSQL functions. If a future migration adds grants/policies, demonstrate least privilege with tests.
- `SECURITY DEFINER` functions: fixed `search_path`, explicit `auth.uid()` and org membership checks, specific `GRANT EXECUTE` only (no PUBLIC/anon), validation before operation. Prefer `SECURITY INVOKER` when possible.
- Service-role key may only exist in trusted environment; using it bypasses RLS, hence every Edge service-role action *must* reauthorize and validate org from user's JWT.

## 3. Auth and session

Magic link/email password or managed identity supported; require verified email/invite for staff. Owner bootstrap is an explicit trusted admin step. Protect role invites/changes with re-auth/MFA recommended for OWNER. Password reset/revoke and inactive status tested.

## 4. Data protection

- Payment evidence, expense receipts, customer contacts, delivery address: private by default and minimized in logs.
- Storage `payment-proofs` private, paths namespaced by `org_id`, 8 MiB MIME/signature validation, short-lived signed URLs only when authorized. Signed URLs expire and are not stored as canonical record. No `anyone-with-link` proof workaround.
- Public invoice token hashed server-side; rate-limit public endpoint; no leakage of internal IDs or all customer fields. Be mindful historical Google Drive invoice PDFs were anyone-with-link: review cutover link policy separately.
- Display/CSV output escapes untrusted content; formula-prefix handling for spreadsheets; no trust of uploaded extension alone.
- Audit every payment, refund, stock adjustment, role change, pre-order override and export; capture request ID, actor, reason, before/after relevant fields, not raw files/secrets.

## 5. Threat test matrix

| Threat | Required test |
|---|---|
| Unauthenticated access | All business reads/writes denied; only public token invoice limited |
| Marketing views P&L | HTTP deny + no P&L columns from restricted DTO |
| Production reads proof | Cannot list, download, create signed URL |
| Cross-organization access | Change `org_id` in request/Storage key → rejected |
| Reused payment reference | Identical retry idempotent; modified payload 409 |
| Parallel refund | Concurrent requests cannot refund more than paid |
| Storage path traversal | Server generates path; client cannot change another user's prefix |
| Stale user roles | Demoted/deactivated account loses access immediately |
| Public invoice enumeration | Unknown/rotated token 404, rate-limited, no adjacent invoice |
| Direct write to ledger via anon key | Denied by grants/RLS |

## 6. Operations

Rotate secrets, maintain independent DB backups with periodic restore rehearsals, confirm Storage backup/retention separately, monitor failed edge requests and auth, establish incident response for exposed proof links. Do not assume DB backups automatically protect private Storage objects.
