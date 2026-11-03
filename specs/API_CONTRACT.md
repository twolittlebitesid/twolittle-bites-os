# API_CONTRACT — Supabase Services & Legacy Gateway Mapping

## 1. Standard contract

All business mutations use authenticated `POST /functions/v1/{domain}/{action}`, bearer Supabase Auth access token, `x-request-id` and `Idempotency-Key` where needed. Responses:

```json
{"ok":true,"data":{"id":"ORD-202610-000001"},"meta":{"requestId":"uuid","already_recorded":false}}
```

```json
{"ok":false,"error":{"code":"PAYMENT_REFERENCE_CONFLICT","message":"Reference already used with different details","fieldErrors":{}},"meta":{"requestId":"uuid"}}
```

HTTP status: 200/201 success, 400 invalid payload, 401 unauthenticated, 403 unauthorized, 404 missing/hidden record, 409 business conflict, 422 rule validation, 429 rate-limit, 500 internal. Do not return internal stack traces or service credentials to browser.

## 2. Domain endpoint inventory

These endpoint names are **proposed**; all exact **existing 108 `ApiGateway.gs` actions** and their legacy names are in `reference/LEGACY_API_ACTIONS.md`. Preserve semantics even if route name changes.

| Domain | Read/query | Mutations |
|---|---|---|
| Auth/App | bootstrap, current member, role matrix, ping | invite, disable, role change (OWNER only) |
| Customers | list/search, profile, segments, affinity | create/update/archive, rebuild metrics |
| Products | catalog/variants, image, recipe detail | product/variant CRUD, recipe create/activate/version, unit conversions |
| Preorders | campaigns, detail, capacity preview | create/update/status, override with reason |
| Orders | list/filter/detail, fulfillment options | create/status, cancel, bulk-progress, fulfill |
| Invoices | list/detail/public/pdf/receipt | create-for-order, mark-sent, cancel, pdf-regenerate |
| Payments | invoice payments, payment-methods, proof authorized view | `record`, `refund`, upload-intent/finalize |
| Production | plan preview, plan/detail, requirements/stock check | create plan, batch/status, post usage once |
| Inventory | balance, movements, low stock | movement, physical count adjustment, rebuild |
| Purchasing | suppliers, purchases/details | create/update supplier, purchase, status, receive |
| Finance | cash/expense/transaction, P&L analytics | expense create/void, COGS backfill/repair |
| Marketing | campaigns/content/attribution/ROAS | campaign/content CRUD, attribution set/clear, linked spend |
| Reporting | daily/weekly/monthly/target/export | cache rebuild, target create/status |
| Settings & Ops | business settings, diagnostics, errors, release | approved settings updates, backup/preflight/mark-ready |

## 3. Sample mutation DTOs (proposed)

### Order create

```json
{
  "customer_id":"CUS-000001",
  "source_channel":"WHATSAPP",
  "preorder_campaign_id":null,
  "fulfillment_type":"PICKUP",
  "fulfillment_date":"2026-11-01",
  "delivery_fee":0,
  "discount":0,
  "tax":0,
  "items":[{"product_id":"PRD-000001","variant_id":null,"quantity":"2","production_notes":""}],
  "notes":""
}
```

Server must obtain active price, snapshot SKU/title/unit price, recalc subtotal/grand total, and validate availability/time/capacity. Client-provided total never authoritative.

### Payment record

```json
{
  "invoice_id":"INV-202610-000001",
  "payment_at":"2026-10-28T13:00:00+07:00",
  "amount":150000,
  "payment_method":"QRIS",
  "reference_no":"QRIS-EXAMPLE-001",
  "proof_upload_id":"temporary-upload-uuid",
  "notes":"DP"
}
```

The upload is a **pre-staged private object**, not a public URL or base64 in a 16MB JSON request. Edge validates file and handles Storage saga. If the same reference is retried with same payment + proof identity, respond `already_recorded=true` with original payment. If different, `409 PAYMENT_REFERENCE_CONFLICT`.

### Refund

```json
{
  "invoice_id":"INV-202610-000001",
  "amount":50000,
  "payment_method":"BCA",
  "reference_no":"REFUND-EXAMPLE-001",
  "notes":"Customer request"
}
```

Refund requires OWNER/FINANCE role and DB-level locked validation.

### Inventory adjustment

```json
{
  "item_type":"INGREDIENT",
  "item_id":"ING-000001",
  "counted_stock_base":"1250.000000",
  "reason":"Physical stock opname 28 Oct",
  "idempotency_key":"client-generated-uuid"
}
```

Server reads current stock while locked, appends delta movement, updates projection, audits.

## 4. TypeScript client surface

```ts
type ApiResult<T> =
  | { ok: true; data: T; meta: { requestId: string; already_recorded?: boolean } }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string,string> }; meta: { requestId: string } };

type MoneyIDR = number; // integer only, safe range check; for large numbers use bigint/string
type LegacyBusinessId = string;
type UnitBase = 'g' | 'ml' | 'pcs';
type PaymentEvent = 'SUCCESS' | 'REFUND' | 'FAILED';
```

Avoid converting `bigint` database values blindly to JS Number if beyond `Number.MAX_SAFE_INTEGER`; validate safe range or serialize monetary amounts as decimal strings.

## 5. Pagination/cache/errors

- Read queries: `page`, `pageSize` (defaults 50, hard cap 200), `q`, `sort`, `dateFrom`, `dateTo`, status filters; use keyset pagination for large ledgers.
- Cache keys include authenticated `org_id` and role; invalidate after mutations; no offline mutation queue for money/stock.
- Upload proofs: two-stage upload + finalization; show retry and status; never assume upload succeeded because network timed out.
- Error taxonomy: `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `ORDER_STATUS_TRANSITION_INVALID`, `NEGATIVE_STOCK_BLOCKED`, `PREORDER_CAPACITY_EXCEEDED`, `PAYMENT_REFERENCE_CONFLICT`, `REFUND_REFERENCE_CONFLICT`, `REFUND_EXCEEDS_PAID`, `PROOF_TYPE`, `PROOF_SIZE`, `DUPLICATE_OPERATION`.
