# WORKFLOWS — Business Rules & State Machines

## 1. Order status (exact legacy graph)

| Current | Allowed next |
|---|---|
| DRAFT | WAITING_PAYMENT, CONFIRMED, CANCELLED |
| WAITING_PAYMENT | CONFIRMED, CANCELLED |
| CONFIRMED | SCHEDULED, IN_PRODUCTION, CANCELLED |
| SCHEDULED | IN_PRODUCTION, CANCELLED |
| IN_PRODUCTION | READY, CANCELLED |
| READY | ON_DELIVERY, COMPLETED, CANCELLED |
| ON_DELIVERY | COMPLETED, CANCELLED |
| COMPLETED | none |
| CANCELLED | none |

**Bulk NEXT:** DRAFT→WAITING_PAYMENT→CONFIRMED→SCHEDULED→IN_PRODUCTION→READY; then READY→ON_DELIVERY for delivery type, else COMPLETED; ON_DELIVERY→COMPLETED. Limit 100, no bulk cancel; explicit target must be valid for *every* selected order before mutation. Cancellation of paid order requires refund flow.

## 2. Payment/refund

1. Accept invoice ID, amount positive IDR, method, reference, optional uploaded proof.
2. Authorize OWNER/FINANCE; ADMIN may create only per granted `PAYMENT_CREATE`, without refund.
3. Lock invoice via `SELECT ... FOR UPDATE`, validate invoice not CANCELLED/REFUNDED, outstanding and idempotency reference.
4. Same reference + same immutable payload returns `already_recorded=true`. Any mismatched amount/method/invoice/status/proof ⇒ conflict (HTTP 409).
5. Insert SUCCESS event, transaction income once, recalc invoice and order payment status; optionally auto-confirm WAITING_PAYMENT order on PAID.
6. Refund: lock same invoice, verify sum refunds + new refund <= sum success, append REFUND payment + refund cash transaction, recalc. Double parallel refunds: at most allowed balance processed.
7. Enqueue invoice PDF regeneration after DB commit. PDF failure does not roll back settled payment.

**File policy:** JPG/PNG/WebP/PDF max 8 MiB; verify magic bytes, private proof path `YYYY/MM/...`; no public bucket. Upload-intent expiry and cleanup orphan upload required. Proof URL from legacy Drive can coexist but new path authoritative for Supabase assets.

## 3. Pre-Order

- Campaign DRAFT→OPEN/ALMOST_FULL/FULL→CLOSED/COMPLETED; CANCELLED terminal. Confirm exact transition table with existing `PreorderService.gs` prior to implementation.
- Cutoff `cutoff_at` and maximum_capacity are enforced at transaction commit, not only UI.
- `capacity_unit` = ORDER/ORDERS means one non-cancelled linked order uses one unit; otherwise sum item quantities in linked non-cancelled orders (as legacy service).
- OWNER may override cutoff/capacity with reason and audit; ADMIN only if `ALLOW_ADMIN_PREORDER_OVERRIDE=true`.
- Booking cache recomputed when linked order cancelled/changed; no overbooking under concurrent creation.

## 4. Recipe calculator

```text
EXACT: multiplier = target_quantity / base_yield
       requirement = quantity_base × multiplier × (1 + waste_allowance_pct/100)
FULL_BATCH: batches = ceil(target_quantity / base_yield)
            expected_output = batches × base_yield
            surplus = expected_output - target_quantity
```

Validate unit dimension compatibility (weight/volume/count), quantity > 0, recipe version locked into production plan, change after execution creates new recipe version. No retroactive modification to historical requirements.

## 5. Purchase receiving → stock

Receive quantity must not exceed ordered-unreceived quantity; support partial receive; generate idempotent receipt key/event; append `PURCHASE_RECEIPT` inventory movements; update average unit cost weighted by on-hand qty/receipt qty. If retry, return existing result. Never directly update inventory without movement. Full receive closes Purchase; partial remains PARTIAL.

## 6. Production plan → stock consumption

Eligible order(s) → plan items → requirements snapshot → stock recheck → start batch → completed/yield/waste → single stock consumption posting. Insufficient stock blocks when `NEGATIVE_STOCK_ALLOWED=false`. Link usage movements to plan/batch and reject second posting. Record actual yield and loss; finance COGS derives posted material consumption, separate from cash outflow.

## 7. Reporting & CRM

Operating revenue, completed orders, net cash, COGS, margin, target vs actual, marketing attribution must use common calculation services/SQL views. `DAILY_METRICS` composite key `(date,key)` and `MONTHLY_METRICS` `(month,key)` are rebuildable caches. CRM segments and aggregate fields are derived from historical orders/payment outcome, not hand-authored after the fact.

## 8. Invoice/public & WhatsApp/printing

- Public invoice/receipt accessed by token-limited endpoint; no internal app shell.
- Invoice PDF version re-generated after payment/refund/fulfillment change; share only intended public invoice, not payment proof.
- WhatsApp template placeholders include `{delivery_fee}` and `{invoice_pdf_url}`; deep link user-initiated.
- Browser receipt print supports 58/80 mm; kitchen ticket optional and permission protected. No automatic device printing.
