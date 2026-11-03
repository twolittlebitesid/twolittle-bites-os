# PERMISSION_MATRIX.md
# Twolittle.bites OS — Role & Authorization Contract

**Version:** P0.1  
**Status:** Frozen

---

## 1. Roles

```text
OWNER
ADMIN
PRODUCTION
MARKETING
FINANCE
```

Role is stored in `USERS.role`.

Frontend hiding is convenience only. Backend service must enforce authorization.

---

## 2. Permission Legend

```text
R    Read
C    Create
U    Update
D    Archive/Cancel/Delete where allowed
Use  Execute tool/action
-    No access
```

| Module / Action | Owner | Admin | Production | Marketing | Finance |
| --- | --- | --- | --- | --- | --- |
| Executive | R | R | - | - | R |
| Business targets/health | CRUD | RU | R | R | R |
| Orders | CRUD | CRUD | R/U status | R | R |
| Pre-Orders | CRUD | CRUD | R | R | R |
| Customers | CRUD | CRUD | R limited | R limited | R |
| Products | CRUD | CRUD | R | R | R |
| Recipes / BOM | CRUD | CRUD | RU | R | R |
| Recipe Calculator | Use | Use | Use | R | R |
| Production Plans | CRUD | CRUD | CRUD | R | R |
| Production Batches | CRUD | CRUD | CRUD | R | R |
| Inventory | CRUD | CRUD | RU operational | R | R |
| Stock Adjustment | Approve/Create | Create | Create | - | R |
| Purchasing | CRUD | CRUD | R | - | R |
| Suppliers | CRUD | CRUD | R | - | R |
| Invoices | CRUD | CRUD | R | R | CRUD |
| Payments | CRUD | Create/Update | - | R | CRUD |
| Expenses | CRUD | Create | - | Create marketing-only | CRUD |
| Transactions | CRUD | R | - | R | CRUD |
| P&L | R | R limited | - | - | R |
| Marketing | CRUD | R | - | CRUD | R |
| Reports | R/Export | R/Export | R operational | R marketing | R/Export |
| Settings | CRUD | R limited | - | - | R limited |
| Users & Roles | CRUD | - | - | - | - |
| Activity Log | R | R limited | - | - | R limited |

---

## 3. Sensitive Data Rules

### Net profit / P&L
Visible:
- OWNER
- FINANCE

ADMIN may receive operational summaries but not necessarily full sensitive profit breakdown.

### Customer data
Marketing may access only fields necessary for legitimate CRM/marketing operations:
- name
- contact
- segment
- order summary/behavior

Marketing does not automatically receive finance-sensitive notes or internal payment evidence.

### Recipe cost detail
Production may see quantities and operational material needs.
Cost/margin visibility can be limited by UI even if recipe quantities are visible.

---

## 4. Critical Action Authorization

### Owner only
- manage users/roles;
- destructive master archive when referenced records exist;
- override locked pre-order cutoff/capacity;
- approve high-risk stock correction policy changes;
- change invoice numbering settings;
- change business-wide financial configuration.

### Owner + Admin
- create/cancel orders;
- manage pre-order campaign;
- manage products/recipes;
- create purchases;
- operational stock adjustments;
- generate invoices.

### Owner + Finance
- verify/refund payments;
- post/cancel financial transaction;
- close finance period when implemented.

### Owner + Admin + Production
- start/complete production batch;
- record yield/waste;
- post production usage movement.

---

## 5. Pre-Order Override

Normal rule:
- after cutoff: no new order;
- at capacity: no new order.

Override:
- OWNER by default.
- ADMIN only if `ALLOW_ADMIN_PREORDER_OVERRIDE = TRUE` in CONFIG.

Every override creates Activity Log with reason.

---

## 6. Stock Adjustment Rule

Manual stock adjustment requires:
- item;
- quantity/delta;
- reason;
- actor;
- timestamp.

Large adjustment threshold can later require Owner approval.

Stock adjustment is never performed by directly editing `INVENTORY.current_stock_base`.

---

## 7. Payment Rule

Payment verification updates:
- payment event status;
- invoice balance/status;
- order payment status;
- sales transaction if applicable;
- audit log.

No role can make invoice paid only by changing invoice status manually.

---

## 8. Authorization Implementation

Recommended server helper:

```javascript
requireRole(['OWNER', 'ADMIN']);
requirePermission('ORDER_CREATE');
```

Services enforce permissions before writes.

Never trust a role value sent by client JavaScript.
