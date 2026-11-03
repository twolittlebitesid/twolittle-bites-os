# Legacy ApiGateway.gs actions — Hotfix 19

108 actions extracted from switch cases. Preserve behavior in rebuilt services; not all are independent REST endpoints.

## app (2)

- `app.bootstrap`
- `app.ping`

## images (1)

- `images.resolve`

## products (3)

- `products.bootstrap`
- `products.create`
- `products.update`

## variants (2)

- `variants.create`
- `variants.update`

## materials (2)

- `materials.create`
- `materials.update`

## units (1)

- `units.createConversion`

## recipes (4)

- `recipes.create`
- `recipes.detail`
- `recipes.activate`
- `recipes.scale`

## customers (5)

- `customers.bootstrap`
- `customers.create`
- `customers.update`
- `customers.profile`
- `customers.rebuildMetrics`

## marketing (10)

- `marketing.bootstrap`
- `marketing.campaign.create`
- `marketing.campaign.update`
- `marketing.campaign.status`
- `marketing.content.create`
- `marketing.content.update`
- `marketing.attribution.set`
- `marketing.attribution.clear`
- `marketing.spend.create`
- `marketing.rebuild`

## executive (1)

- `executive.bootstrap`

## business (3)

- `business.bootstrap`
- `business.target.create`
- `business.target.status`

## reports (5)

- `reports.bootstrap`
- `reports.cache.rebuild`
- `reports.target.create`
- `reports.target.status`
- `reports.export`

## settings (8)

- `settings.bootstrap`
- `settings.business.update`
- `settings.commerce.update`
- `settings.invoice.update`
- `settings.printing.update`
- `settings.automation.update`
- `settings.user.create`
- `settings.user.update`

## receipts (2)

- `receipts.url`
- `receipts.kitchenData`

## system (8)

- `system.diagnostics`
- `system.regression`
- `system.errors.clear`
- `system.backup.create`
- `system.backup.recoveryCopy`
- `system.automation.configure`
- `system.automation.remove`
- `system.maintenance.runNow`

## release (7)

- `release.bootstrap`
- `release.preflight`
- `release.backup`
- `release.productionReady`
- `release.markReleased`
- `release.rollbackRequired`
- `release.rollbackClear`

## orders (7)

- `orders.bootstrap`
- `orders.create`
- `orders.detail`
- `orders.status`
- `orders.bulkProgress`
- `orders.cancel`
- `orders.fulfillment`

## finance (3)

- `finance.bootstrap`
- `finance.analytics`
- `finance.backfillCogs`

## invoices (7)

- `invoices.createForOrder`
- `invoices.detail`
- `invoices.markSent`
- `invoices.cancel`
- `invoices.whatsapp`
- `invoices.pdf`
- `invoices.pdfRegenerate`

## payments (2)

- `payments.record`
- `payments.refund`

## production (6)

- `production.bootstrap`
- `production.preview`
- `production.create`
- `production.detail`
- `production.refreshStock`
- `production.status`

## inventory (5)

- `inventory.bootstrap`
- `inventory.movement`
- `inventory.adjustCount`
- `inventory.postProductionUsage`
- `inventory.rebuild`

## purchasing (1)

- `purchasing.bootstrap`

## suppliers (2)

- `suppliers.create`
- `suppliers.update`

## purchases (4)

- `purchases.create`
- `purchases.detail`
- `purchases.status`
- `purchases.receive`

## preorders (5)

- `preorders.bootstrap`
- `preorders.create`
- `preorders.update`
- `preorders.status`
- `preorders.detail`

## expenses (2)

- `expenses.create`
- `expenses.void`

