# SHEET_SCHEMA.md
# Twolittle.bites OS — Google Sheets Storage Contract

**Version:** P0.1  
**Status:** Frozen for Phase 1 implementation

---

## 1. Spreadsheet Rules

- One primary spreadsheet for MVP.
- One sheet = one logical table.
- Row 1 = canonical field names.
- Field names are `snake_case`.
- No merged cells in database sheets.
- No blank separator rows.
- Do not use row number as identifier.
- Do not manually reorder field names after implementation without migration.
- UI may display localized labels; storage names stay stable.
- All writes go through Apps Script service/repository layer, not UI direct edit.
- Critical tables should be protected from casual manual editing.

### Data formats

```text
Date:          YYYY-MM-DD
Datetime:      ISO 8601, Asia/Jakarta
Time:          HH:mm
Currency:      integer Rupiah
Percentage:    decimal percentage value (e.g. 58.8)
Phone:         62xxxxxxxxxx
Boolean:       TRUE / FALSE
JSON:          compact JSON string
```

---

## 2. Source-of-Truth Rule

`INVENTORY_MOVEMENTS` is the stock ledger. `INVENTORY` is a materialized balance/cache.

`PAYMENTS` contains payment events. Invoice paid/remaining values are derived/cache.

`ORDER_ITEMS` stores ordered price snapshots.

`PRODUCTION_REQUIREMENTS` stores recipe/material requirement snapshots for a production plan.

`DAILY_METRICS` and `MONTHLY_METRICS` are rebuildable caches.

---

## 3. Sheet Catalog

| Sheet | Nature |
| --- | --- |
| CONFIG | Primary |
| USERS | Primary |
| BUSINESS_SETTINGS | Primary |
| CUSTOMERS | Primary |
| PRODUCTS | Primary |
| PRODUCT_VARIANTS | Primary |
| INGREDIENTS | Primary |
| PACKAGING | Primary |
| UNIT_CONVERSIONS | Primary |
| RECIPES | Primary |
| RECIPE_ITEMS | Primary |
| PREORDER_CAMPAIGNS | Primary |
| ORDERS | Primary |
| ORDER_ITEMS | Primary |
| INVOICES | Primary |
| PAYMENTS | Primary |
| PRODUCTION_PLANS | Primary |
| PRODUCTION_PLAN_ITEMS | Primary |
| PRODUCTION_REQUIREMENTS | Primary |
| PRODUCTION_BATCHES | Primary |
| INVENTORY | Primary |
| INVENTORY_MOVEMENTS | Primary |
| SUPPLIERS | Primary |
| PURCHASES | Primary |
| PURCHASE_ITEMS | Primary |
| EXPENSES | Primary |
| TRANSACTIONS | Primary |
| BUSINESS_TARGETS | Primary |
| MARKETING_CAMPAIGNS | Primary |
| CONTENT | Primary |
| DAILY_METRICS | Derived cache |
| MONTHLY_METRICS | Derived cache |
| ACTIVITY_LOG | Primary |

---

## CONFIG

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| config_key | String | Yes | PK | UPPER_SNAKE_CASE |
| config_value | String/JSON | Yes |  |  |
| value_type | Enum | Yes |  | STRING, NUMBER, BOOLEAN, JSON |
| description | String | No |  |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## USERS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| user_id | String | Yes | PK | USR-###### |
| email | String | Yes | Unique | lowercase |
| display_name | String | Yes |  |  |
| role | Enum | Yes |  | OWNER, ADMIN, PRODUCTION, FINANCE, MARKETING |
| status | Enum | Yes |  | ACTIVE, INACTIVE |
| last_login_at | ISO datetime | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## BUSINESS_SETTINGS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| setting_key | String | Yes | PK | e.g. invoice_prefix |
| setting_value | String/JSON | Yes |  |  |
| value_type | Enum | Yes |  | STRING, NUMBER, BOOLEAN, JSON |
| group_name | String | Yes |  | BUSINESS, INVOICE, WHATSAPP, PAYMENT, DELIVERY |
| description | String | No |  |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## CUSTOMERS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| customer_id | String | Yes | PK | CUS-###### |
| name | String | Yes |  |  |
| whatsapp | String | Yes | Indexed logical | canonical 62... |
| email | String | No |  | lowercase |
| default_address | String | No |  |  |
| segment | Enum | Yes |  | NEW, REPEAT, VIP, DORMANT, HIGH_VALUE |
| first_order_date | Date | No | Derived/cache |  |
| last_order_date | Date | No | Derived/cache |  |
| total_orders | Integer | Yes | Derived/cache | default 0 |
| total_spend | IDR integer | Yes | Derived/cache | default 0 |
| average_order_value | IDR integer | Yes | Derived/cache | default 0 |
| favorite_product_id | String | No | FK PRODUCTS |  |
| notes | String | No |  |  |
| status | Enum | Yes |  | ACTIVE, ARCHIVED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| product_id | String | Yes | PK | PRD-###### |
| sku | String | Yes | Unique |  |
| product_name | String | Yes |  |  |
| category | String | Yes |  |  |
| selling_price | IDR integer | Yes |  | >=0 |
| base_recipe_id | String | No | FK RECIPES | active/default recipe |
| default_packaging_id | String | No | FK PACKAGING | optional |
| image_url | URL | No |  |  |
| current_cogs | IDR integer | Yes | Derived/cache |  |
| gross_profit | IDR integer | Yes | Derived/cache |  |
| gross_margin_pct | Decimal | Yes | Derived/cache | 0-100 |
| status | Enum | Yes |  | ACTIVE, INACTIVE, SEASONAL, ARCHIVED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCT_VARIANTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| variant_id | String | Yes | PK | VAR-###### |
| product_id | String | Yes | FK PRODUCTS |  |
| variant_name | String | Yes |  |  |
| size | String | No |  |  |
| sku | String | Yes | Unique |  |
| selling_price_override | IDR integer | No |  | blank = product price |
| recipe_id | String | No | FK RECIPES | blank = product base recipe |
| status | Enum | Yes |  | ACTIVE, INACTIVE, ARCHIVED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## INGREDIENTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| ingredient_id | String | Yes | PK | ING-###### |
| ingredient_name | String | Yes |  |  |
| category | String | Yes |  |  |
| base_unit | Unit | Yes |  | g, ml, pcs |
| purchase_unit | Unit | Yes |  |  |
| purchase_to_base_factor | Decimal | Yes |  | >0 |
| minimum_stock_base | Decimal | Yes |  | default 0 |
| average_cost_per_base_unit | Decimal IDR | Yes | Derived/cache |  |
| latest_cost_per_base_unit | Decimal IDR | Yes | Derived/cache |  |
| default_supplier_id | String | No | FK SUPPLIERS |  |
| status | Enum | Yes |  | ACTIVE, INACTIVE, ARCHIVED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PACKAGING

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| packaging_id | String | Yes | PK | PKG-###### |
| packaging_name | String | Yes |  |  |
| category | String | Yes |  |  |
| base_unit | Unit | Yes |  | normally pcs |
| purchase_unit | Unit | Yes |  |  |
| purchase_to_base_factor | Decimal | Yes |  | >0 |
| minimum_stock_base | Decimal | Yes |  |  |
| average_cost_per_base_unit | Decimal IDR | Yes | Derived/cache |  |
| latest_cost_per_base_unit | Decimal IDR | Yes | Derived/cache |  |
| default_supplier_id | String | No | FK SUPPLIERS |  |
| status | Enum | Yes |  | ACTIVE, INACTIVE, ARCHIVED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## UNIT_CONVERSIONS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| conversion_id | String | Yes | PK | UCV-###### |
| scope | Enum | Yes |  | STANDARD, ITEM |
| item_type | Enum | No |  | INGREDIENT, PACKAGING |
| item_id | String | No | Polymorphic FK | required for ITEM scope |
| from_unit | Unit | Yes |  |  |
| to_unit | Unit | Yes |  |  |
| factor | Decimal | Yes |  | qty_to = qty_from × factor |
| status | Enum | Yes |  | ACTIVE, INACTIVE |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## RECIPES

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| recipe_id | String | Yes | PK | RCP-###### |
| product_id | String | Yes | FK PRODUCTS |  |
| variant_id | String | No | FK PRODUCT_VARIANTS |  |
| recipe_name | String | Yes |  |  |
| base_yield | Decimal | Yes |  | >0 |
| yield_unit | Unit | Yes |  | e.g. cup, pcs, box |
| scaling_mode | Enum | Yes |  | EXACT, FULL_BATCH |
| version | Integer | Yes |  | starts 1 |
| status | Enum | Yes |  | DRAFT, ACTIVE, INACTIVE, ARCHIVED |
| effective_from | Date | No |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## RECIPE_ITEMS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| recipe_item_id | String | Yes | PK | RCI-###### |
| recipe_id | String | Yes | FK RECIPES |  |
| item_type | Enum | Yes |  | INGREDIENT, PACKAGING |
| item_id | String | Yes | Polymorphic FK |  |
| quantity | Decimal | Yes |  | >0 |
| unit | Unit | Yes |  |  |
| quantity_base | Decimal | Yes | Normalized |  |
| waste_allowance_pct | Decimal | Yes |  | default 0 |
| sort_order | Integer | Yes |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PREORDER_CAMPAIGNS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| preorder_campaign_id | String | Yes | PK | PRE-YYYYMM-###### |
| campaign_name | String | Yes |  |  |
| start_at | ISO datetime | Yes |  |  |
| cutoff_at | ISO datetime | Yes |  |  |
| production_date | Date | Yes |  |  |
| fulfillment_date | Date | Yes |  |  |
| maximum_capacity | Decimal | Yes |  | >0 |
| capacity_unit | String | Yes |  | box, order, pcs etc |
| current_booked | Decimal | Yes | Derived/cache |  |
| remaining_capacity | Decimal | Yes | Derived/cache |  |
| status | Enum | Yes |  | DRAFT, OPEN, ALMOST_FULL, FULL, CLOSED, COMPLETED, CANCELLED |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## ORDERS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| order_id | String | Yes | PK | ORD-YYYYMM-###### |
| order_date | Date | Yes |  |  |
| customer_id | String | Yes | FK CUSTOMERS |  |
| source_channel | String | Yes |  | WHATSAPP, INSTAGRAM, etc |
| preorder_campaign_id | String | No | FK PREORDER_CAMPAIGNS |  |
| order_status | Enum | Yes |  | see CONVENTIONS |
| payment_status | Enum | Yes |  | see CONVENTIONS |
| invoice_status | Enum | Yes | Derived/cache | mirror active invoice |
| fulfillment_type | Enum | Yes |  |  |
| fulfillment_date | Date | No |  |  |
| fulfillment_time_start | Time | No |  |  |
| fulfillment_time_end | Time | No |  |  |
| delivery_address | String | No |  |  |
| subtotal | IDR integer | Yes |  |  |
| discount | IDR integer | Yes |  | default 0 |
| delivery_fee | IDR integer | Yes |  | default 0 |
| tax | IDR integer | Yes |  | default 0 |
| grand_total | IDR integer | Yes |  | >=0 |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## ORDER_ITEMS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| order_item_id | String | Yes | PK | ORI-###### |
| order_id | String | Yes | FK ORDERS |  |
| product_id | String | Yes | FK PRODUCTS |  |
| variant_id | String | No | FK PRODUCT_VARIANTS |  |
| product_name_snapshot | String | Yes | Snapshot |  |
| sku_snapshot | String | Yes | Snapshot |  |
| quantity | Decimal | Yes |  | >0 |
| unit_price | IDR integer | Yes | Snapshot |  |
| line_discount | IDR integer | Yes |  | default 0 |
| line_total | IDR integer | Yes |  |  |
| production_notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## INVOICES

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| invoice_id | String | Yes | PK | INV-YYYYMM-###### |
| invoice_number | String | Yes | Unique | same/display business number |
| order_id | String | Yes | FK ORDERS | one active invoice/order MVP |
| customer_id | String | Yes | FK CUSTOMERS |  |
| invoice_date | Date | Yes |  |  |
| due_at | ISO datetime | No |  |  |
| subtotal | IDR integer | Yes | Snapshot |  |
| discount | IDR integer | Yes | Snapshot |  |
| delivery_fee | IDR integer | Yes | Snapshot |  |
| tax | IDR integer | Yes | Snapshot |  |
| grand_total | IDR integer | Yes | Snapshot |  |
| paid_amount | IDR integer | Yes | Derived/cache |  |
| remaining_amount | IDR integer | Yes | Derived/cache |  |
| status | Enum | Yes |  | see CONVENTIONS |
| last_payment_method | String | No |  |  |
| public_token | String | Yes | Unique | unguessable token |
| invoice_url | URL | Yes | Derived/cache |  |
| sent_at | ISO datetime | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PAYMENTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| payment_id | String | Yes | PK | PAY-YYYYMM-###### |
| invoice_id | String | Yes | FK INVOICES |  |
| order_id | String | Yes | FK ORDERS |  |
| payment_at | ISO datetime | Yes |  |  |
| amount | IDR integer | Yes |  | >0 |
| payment_method | String | Yes |  |  |
| reference_no | String | No |  | bank/QR reference |
| status | Enum | Yes |  | PENDING, VERIFIED, FAILED, REFUNDED |
| proof_url | URL | No |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCTION_PLANS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| production_plan_id | String | Yes | PK | PPL-YYYYMM-###### |
| production_date | Date | Yes |  |  |
| source_type | Enum | Yes |  | MANUAL, ORDER, PREORDER, SELECTED_ORDERS, DATE_RANGE |
| source_id | String | No | Reference |  |
| status | Enum | Yes |  | DRAFT, READY, IN_PROGRESS, COMPLETED, CANCELLED |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCTION_PLAN_ITEMS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| plan_item_id | String | Yes | PK | PPI-###### |
| production_plan_id | String | Yes | FK PRODUCTION_PLANS |  |
| product_id | String | Yes | FK PRODUCTS |  |
| variant_id | String | No | FK PRODUCT_VARIANTS |  |
| recipe_id | String | Yes | FK RECIPES |  |
| recipe_version | Integer | Yes | Snapshot |  |
| target_quantity | Decimal | Yes |  | >0 |
| target_unit | Unit | Yes |  |  |
| scaling_mode | Enum | Yes | Snapshot | EXACT, FULL_BATCH |
| multiplier | Decimal | Yes | Calculated |  |
| required_batches | Decimal | Yes | Calculated |  |
| expected_output | Decimal | Yes | Calculated |  |
| expected_surplus | Decimal | Yes | Calculated |  |
| status | Enum | Yes |  | PLANNED, READY, IN_PROGRESS, COMPLETED, CANCELLED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCTION_REQUIREMENTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| requirement_id | String | Yes | PK | REQ-###### |
| production_plan_id | String | Yes | FK PRODUCTION_PLANS |  |
| plan_item_id | String | No | FK PRODUCTION_PLAN_ITEMS | blank allowed for aggregate row |
| item_type | Enum | Yes |  | INGREDIENT, PACKAGING |
| item_id | String | Yes | Polymorphic FK |  |
| required_qty_base | Decimal | Yes | Snapshot |  |
| available_stock_base | Decimal | Yes | Snapshot at calculation |  |
| shortage_qty_base | Decimal | Yes | Calculated snapshot |  |
| base_unit | Unit | Yes |  |  |
| status | Enum | Yes |  | SUFFICIENT, LOW, SHORTAGE |
| calculated_at | ISO datetime | Yes |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PRODUCTION_BATCHES

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| production_batch_id | String | Yes | PK | BAT-YYYYMM-###### |
| plan_item_id | String | Yes | FK PRODUCTION_PLAN_ITEMS |  |
| product_id | String | Yes | FK PRODUCTS |  |
| recipe_id | String | Yes | FK RECIPES |  |
| recipe_version | Integer | Yes | Snapshot |  |
| batch_no | Integer | Yes |  |  |
| planned_qty | Decimal | Yes |  |  |
| actual_qty | Decimal | No |  |  |
| failed_qty | Decimal | No |  |  |
| waste_qty | Decimal | No |  |  |
| yield_rate_pct | Decimal | No | Derived |  |
| status | Enum | Yes |  | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |
| started_at | ISO datetime | No |  |  |
| completed_at | ISO datetime | No |  |  |
| pic_user_id | String | No | FK USERS |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## INVENTORY

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| inventory_id | String | Yes | PK | STK-###### |
| item_type | Enum | Yes |  | INGREDIENT, PACKAGING |
| item_id | String | Yes | Unique composite |  |
| current_stock_base | Decimal | Yes | Derived/cache |  |
| minimum_stock_base | Decimal | Yes | Cache/master copy |  |
| average_cost_per_base_unit | Decimal IDR | Yes | Derived/cache |  |
| last_movement_at | ISO datetime | No | Derived/cache |  |
| updated_at | ISO datetime | Yes |  |  |

---

## INVENTORY_MOVEMENTS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| movement_id | String | Yes | PK | MOV-YYYYMM-###### |
| movement_at | ISO datetime | Yes |  |  |
| item_type | Enum | Yes |  | INGREDIENT, PACKAGING |
| item_id | String | Yes | Polymorphic FK |  |
| movement_type | Enum | Yes |  | PURCHASE, PRODUCTION_USAGE, MANUAL_ADJUSTMENT, WASTE, RETURN, STOCK_OPNAME |
| quantity_in_base | Decimal | Yes |  | default 0 |
| quantity_out_base | Decimal | Yes |  | default 0 |
| balance_after_base | Decimal | Yes | Calculated |  |
| base_unit | Unit | Yes |  |  |
| reference_type | String | No |  | PURCHASE, BATCH, ADJUSTMENT etc |
| reference_id | String | No |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## SUPPLIERS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| supplier_id | String | Yes | PK | SUP-###### |
| supplier_name | String | Yes |  |  |
| contact_person | String | No |  |  |
| whatsapp | String | No |  | canonical 62... |
| email | String | No |  |  |
| address | String | No |  |  |
| lead_time_days | Integer | No |  |  |
| minimum_order_value | IDR integer | No |  |  |
| status | Enum | Yes |  | ACTIVE, INACTIVE, ARCHIVED |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PURCHASES

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| purchase_id | String | Yes | PK | PUR-YYYYMM-###### |
| supplier_id | String | Yes | FK SUPPLIERS |  |
| purchase_date | Date | Yes |  |  |
| expected_date | Date | No |  |  |
| received_date | Date | No |  |  |
| status | Enum | Yes |  | DRAFT, ORDERED, PARTIAL_RECEIVED, RECEIVED, CANCELLED |
| payment_status | Enum | Yes |  | UNPAID, PARTIAL, PAID, REFUNDED |
| subtotal | IDR integer | Yes |  |  |
| delivery_cost | IDR integer | Yes |  | default 0 |
| total_cost | IDR integer | Yes |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## PURCHASE_ITEMS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| purchase_item_id | String | Yes | PK | PUI-###### |
| purchase_id | String | Yes | FK PURCHASES |  |
| item_type | Enum | Yes |  | INGREDIENT, PACKAGING |
| item_id | String | Yes | Polymorphic FK |  |
| quantity | Decimal | Yes |  |  |
| unit | Unit | Yes |  |  |
| quantity_base | Decimal | Yes | Normalized |  |
| unit_cost | IDR decimal | Yes |  | per entered unit |
| total_cost | IDR integer | Yes |  |  |
| received_qty_base | Decimal | Yes |  | default 0 |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## EXPENSES

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| expense_id | String | Yes | PK | EXP-YYYYMM-###### |
| expense_date | Date | Yes |  |  |
| category | String | Yes |  |  |
| vendor | String | No |  |  |
| amount | IDR integer | Yes |  | >0 |
| payment_method | String | Yes |  |  |
| receipt_url | URL | No |  |  |
| status | Enum | Yes |  | DRAFT, POSTED, CANCELLED |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## TRANSACTIONS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| transaction_id | String | Yes | PK | TRX-YYYYMM-###### |
| transaction_at | ISO datetime | Yes |  |  |
| transaction_type | Enum | Yes |  | SALES, EXPENSE, PURCHASE, REFUND, OTHER_INCOME, OWNER_INJECTION, WITHDRAWAL |
| category | String | No |  |  |
| reference_type | String | No |  | PAYMENT, EXPENSE, PURCHASE, etc |
| reference_id | String | No |  |  |
| amount_in | IDR integer | Yes |  | default 0 |
| amount_out | IDR integer | Yes |  | default 0 |
| payment_method | String | No |  |  |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## BUSINESS_TARGETS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| target_id | String | Yes | PK | TGT-###### |
| period_type | Enum | Yes |  | MONTHLY, QUARTERLY, ANNUAL |
| period_start | Date | Yes |  |  |
| period_end | Date | Yes |  |  |
| metric_key | String | Yes |  | REVENUE, PROFIT, ORDERS, etc |
| target_value | Decimal | Yes |  |  |
| unit | String | Yes |  | IDR, COUNT, PERCENT |
| status | Enum | Yes |  | ACTIVE, CLOSED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## MARKETING_CAMPAIGNS

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| marketing_campaign_id | String | Yes | PK | MKT-YYYYMM-###### |
| campaign_name | String | Yes |  |  |
| start_date | Date | Yes |  |  |
| end_date | Date | No |  |  |
| budget | IDR integer | Yes |  | default 0 |
| spend | IDR integer | Yes | Derived/manual MVP |  |
| revenue_attributed | IDR integer | Yes | Derived |  |
| orders_attributed | Integer | Yes | Derived |  |
| new_customers | Integer | Yes | Derived |  |
| repeat_customers | Integer | Yes | Derived |  |
| status | Enum | Yes |  | DRAFT, ACTIVE, COMPLETED, CANCELLED |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## CONTENT

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| content_id | String | Yes | PK | CNT-###### |
| marketing_campaign_id | String | No | FK MARKETING_CAMPAIGNS |  |
| platform | Enum | Yes |  | INSTAGRAM, TIKTOK, THREADS, WHATSAPP, OTHER |
| pillar | String | No |  |  |
| format | String | No |  |  |
| publish_date | Date | No |  |  |
| url | URL | No |  |  |
| reach | Integer | Yes |  | default 0 |
| views | Integer | Yes |  | default 0 |
| engagement | Integer | Yes |  | default 0 |
| link_click | Integer | Yes |  | default 0 |
| orders_attributed | Integer | Yes |  | default 0 |
| revenue_attributed | IDR integer | Yes |  | default 0 |
| notes | String | No |  |  |
| created_at | ISO datetime | Yes |  | Asia/Jakarta |
| created_by | User ID | Yes | FK USERS |  |
| updated_at | ISO datetime | Yes |  |  |
| updated_by | User ID | Yes | FK USERS |  |

---

## DAILY_METRICS

**Nature:** Derived cache

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| metric_date | Date | Yes | Composite PK |  |
| metric_key | String | Yes | Composite PK |  |
| metric_value | Decimal | Yes | Derived cache |  |
| unit | String | Yes |  |  |
| calculated_at | ISO datetime | Yes |  |  |

---

## MONTHLY_METRICS

**Nature:** Derived cache

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| month | String YYYY-MM | Yes | Composite PK |  |
| metric_key | String | Yes | Composite PK |  |
| metric_value | Decimal | Yes | Derived cache |  |
| unit | String | Yes |  |  |
| calculated_at | ISO datetime | Yes |  |  |

---

## ACTIVITY_LOG

**Nature:** Primary

| Column | Type | Required | Key / Reference | Notes |
| --- | --- | --- | --- | --- |
| log_id | String | Yes | PK | LOG-YYYYMM-###### |
| timestamp | ISO datetime | Yes |  |  |
| user_id | String | Yes | FK USERS |  |
| action | Enum | Yes |  | CREATE, UPDATE, ARCHIVE, STATUS_CHANGE, PAYMENT, STOCK_ADJUSTMENT |
| entity_type | String | Yes |  |  |
| entity_id | String | Yes |  |  |
| before_json | JSON String | No |  |  |
| after_json | JSON String | No |  |  |
| source | String | Yes |  | WEB_APP, SYSTEM |
| notes | String | No |  |  |


---

## Validation / Protection Recommendations

### Protected from manual edits
- IDs
- calculated totals
- paid/remaining amounts
- current stock
- average cost
- margin fields
- activity log

### Data validation dropdowns
Implement enum values from `CONVENTIONS.md`.

### Referential validation
Apps Script validates references before insert/update.

### Unique constraints implemented in code
Google Sheets has no native relational unique constraint. Service layer must check:
- user email
- product SKU
- variant SKU
- invoice number
- customer duplicate candidates by WhatsApp
- item-level inventory uniqueness
- public invoice token

---

## Migration Rule

Any added/renamed/removed column requires:
1. schema version increment;
2. migration function;
3. backup;
4. dry-run validation;
5. migration log;
6. app version compatible with new schema.

Never rely on silently inserting a column manually in the production spreadsheet.
