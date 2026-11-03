import { useState, type FormEvent } from 'react';
import { formatIDR, formatNumber } from '../domain/calculators';
import { hasPermission } from '../domain/navigation';
import type { AppPreviewState, PurchaseRecord, SupplierRecord } from '../state/previewData';
import { StatusPill } from '../components/Charts';

export function InventoryPage({
  state,
  onAdjustStock,
  onPostProductionUsage,
  onToast
}: {
  state: AppPreviewState;
  onAdjustStock: (itemId: string, countedStockBase: number, reason: string) => void;
  onPostProductionUsage: (planId: string) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'stock' | 'movements' | 'production'>('overview');
  const [adjustItemId, setAdjustItemId] = useState<string | null>(null);
  const [countedStock, setCountedStock] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock opname harian dapur');

  const canAdjust = hasPermission(state.role, 'INVENTORY_ADJUST');
  const canSeeValue = state.role !== 'PRODUCTION' && state.role !== 'MARKETING';

  const totalStockValue = state.materials.reduce(
    (sum, m) => sum + Math.round(m.currentStockBase * m.avgCostBase),
    0
  );
  const lowCount = state.materials.filter(
    m => m.currentStockBase > 0 && m.currentStockBase <= m.minStockBase
  ).length;
  const outCount = state.materials.filter(m => m.currentStockBase <= 0).length;

  const selectedMaterial = state.materials.find(m => m.itemId === adjustItemId);

  function submitAdjustment(e: FormEvent) {
    e.preventDefault();
    if (!adjustItemId) return;
    const counted = Number(countedStock);
    if (!Number.isFinite(counted) || (counted < 0 && !state.settings.negativeStockAllowed)) {
      onToast(
        'Stok negatif diblokir',
        'NEGATIVE_STOCK_ALLOWED bernilai false. Stok tidak boleh di bawah 0.',
        'error'
      );
      return;
    }
    onAdjustStock(adjustItemId, counted, adjustReason.trim() || 'Stock opname');
    setAdjustItemId(null);
  }

  return (
    <section className="page inventory-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">inventory_2</span>
        </div>
        <div className="module-copy">
          <h2>Inventory</h2>
          <p>
            Stock is controlled by an append-only movement ledger. The current balance is a
            materialized cache derived from IN, OUT, adjustments, waste, and production usage.
          </p>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="product-tabs" role="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['stock', 'Stock'],
              ['movements', 'Movements'],
              ['production', 'Production Usage']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`product-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            onToast('Inventory disegarkan', 'Saldo cache direkonsiliasi dengan ledger.', 'info')
          }
        >
          <span className="material-symbols-outlined">refresh</span> Refresh
        </button>
      </div>

      {tab === 'overview' && (
        <section className="inventory-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Tracked Materials</div>
              <div className="card-value">{state.materials.length}</div>
            </article>
            <article className="card">
              <div className="card-label">Stock Value</div>
              <div className="card-value">
                {canSeeValue ? formatIDR(totalStockValue) : ' Terbatas'}
              </div>
            </article>
            <article className="card">
              <div className="card-label">Low Stock</div>
              <div className="card-value">{lowCount}</div>
            </article>
            <article className="card pink">
              <div className="card-label">Out of Stock</div>
              <div className="card-value">{outCount}</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Source of truth</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Movement Ledger
              </h3>
              <p className="page-subtitle">
                Never edit Current Stock directly. Every stock change becomes a movement, and the
                cached balance follows that ledger.
              </p>
              <div className="inventory-ledger-flow">
                <span>OPENING / IN / RETURN</span>
                <span>+</span>
                <span>ADJUSTMENT</span>
                <span>−</span>
                <span>PRODUCTION / WASTE / OUT</span>
                <span>=</span>
                <strong>Current Stock</strong>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Reconciliation</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Ledger vs Cached Balance
              </h3>
              <p className="page-subtitle">
                Status rekonsiliasi: <strong>100% Sinkron</strong> ({state.materials.length} item).
                Konfigurasi <code>NEGATIVE_STOCK_ALLOWED</code> saat ini:{' '}
                <strong>{state.settings.negativeStockAllowed ? 'TRUE' : 'FALSE'}</strong>.
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'stock' && (
        <section className="inventory-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Material Stock</div>
              <h3 className="section-title">Ingredients &amp; Packaging</h3>
              <p className="section-copy">
                Manual IN/OUT, physical stock count adjustment, and waste are posted as movements.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Type</th>
                  <th className="num">Current</th>
                  <th className="num">Minimum</th>
                  {canSeeValue && <th className="num">Avg Cost</th>}
                  {canSeeValue && <th className="num">Value</th>}
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.materials.map(m => {
                  const st =
                    m.currentStockBase <= 0
                      ? 'OUT_OF_STOCK'
                      : m.currentStockBase <= m.minStockBase
                        ? 'LOW'
                        : 'HEALTHY';
                  return (
                    <tr key={m.itemId}>
                      <td>
                        <strong>{m.name}</strong>
                        <div>
                          <small>{m.itemId}</small>
                        </div>
                      </td>
                      <td>{m.itemType}</td>
                      <td className="num">
                        <strong>
                          {formatNumber(m.currentStockBase)} {m.baseUnit}
                        </strong>
                      </td>
                      <td className="num">
                        {formatNumber(m.minStockBase)} {m.baseUnit}
                      </td>
                      {canSeeValue && (
                        <td className="num">
                          {formatIDR(m.avgCostBase)}/{m.baseUnit}
                        </td>
                      )}
                      {canSeeValue && (
                        <td className="num">
                          {formatIDR(Math.round(m.currentStockBase * m.avgCostBase))}
                        </td>
                      )}
                      <td>
                        <StatusPill status={st} />
                      </td>
                      <td>
                        {canAdjust && (
                          <button
                            type="button"
                            className="secondary-btn compact-btn"
                            onClick={() => {
                              setAdjustItemId(m.itemId);
                              setCountedStock(String(m.currentStockBase));
                            }}
                          >
                            Opname / Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'movements' && (
        <section className="inventory-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Stock Ledger</div>
              <h3 className="section-title">Inventory Movements</h3>
              <p className="section-copy">Append-only movement events, newest first.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Movement</th>
                  <th>Date</th>
                  <th>Material</th>
                  <th>Type</th>
                  <th className="num">In</th>
                  <th className="num">Out</th>
                  <th className="num">Balance</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {state.inventoryMovements.map(mov => (
                  <tr key={mov.movementId}>
                    <td>
                      <strong>{mov.movementId}</strong>
                      <div>
                        <small>{mov.notes}</small>
                      </div>
                    </td>
                    <td>{mov.movementAt.replace('T', ' ').slice(0, 16)}</td>
                    <td>{mov.materialName}</td>
                    <td>
                      <StatusPill status={mov.movementType} />
                    </td>
                    <td className="num">
                      {mov.qtyInBase > 0 ? `+${formatNumber(mov.qtyInBase)} ${mov.baseUnit}` : '—'}
                    </td>
                    <td className="num">
                      {mov.qtyOutBase > 0
                        ? `−${formatNumber(mov.qtyOutBase)} ${mov.baseUnit}`
                        : '—'}
                    </td>
                    <td className="num">
                      <strong>
                        {formatNumber(mov.balanceAfterBase)} {mov.baseUnit}
                      </strong>
                    </td>
                    <td>{mov.referenceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'production' && (
        <section className="inventory-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Production Consumption</div>
              <h3 className="section-title">Post Planned Usage</h3>
              <p className="section-copy">
                Production Usage consumes the frozen material requirement from a Production Plan
                exactly once. Stock shortages block posting when negative stock is disabled.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Production Date</th>
                  <th className="num">Requirements</th>
                  <th className="num">Shortage Flags</th>
                  <th>Status</th>
                  <th>Inventory Usage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.productionPlans.map(plan => {
                  const shortages = plan.requirements.filter(r => r.status === 'SHORTAGE').length;
                  return (
                    <tr key={plan.planId}>
                      <td>
                        <strong>{plan.planId}</strong>
                      </td>
                      <td>{plan.productionDate}</td>
                      <td className="num">{plan.requirements.length}</td>
                      <td className="num">{shortages}</td>
                      <td>
                        <StatusPill status={plan.status} />
                      </td>
                      <td>
                        <StatusPill status={plan.usagePosted ? 'COMPLETED' : 'WAITING'} />
                      </td>
                      <td>
                        {canAdjust && !plan.usagePosted && (
                          <button
                            type="button"
                            className="primary-btn compact-btn"
                            onClick={() => onPostProductionUsage(plan.planId)}
                          >
                            Post Usage Once
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedMaterial && (
        <div className="modal-overlay" onClick={() => setAdjustItemId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Stock Opname Adjustment</div>
                <h3 className="section-title">{selectedMaterial.name}</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAdjustItemId(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={submitAdjustment}>
              <label className="form-field">
                <span>Stok Saat Ini ({selectedMaterial.baseUnit})</span>
                <input disabled value={selectedMaterial.currentStockBase} />
              </label>
              <label className="form-field">
                <span>Hasil Hitung Fisik ({selectedMaterial.baseUnit})</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={countedStock}
                  onChange={e => setCountedStock(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Alasan Penyesuaian (Wajib untuk Audit Log)</span>
                <input
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAdjustItemId(null)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Post Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export function PurchasingPage({
  state,
  onReceivePurchase,
  onAddPurchase,
  onAddSupplier,
  onToast
}: {
  state: AppPreviewState;
  onReceivePurchase: (purchaseId: string) => void;
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onAddSupplier: (supplier: SupplierRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'shortages' | 'purchases' | 'suppliers' | 'prices'>(
    'overview'
  );
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(state.suppliers[0]?.supplierId ?? 'SUP-000001');
  const [poItemId, setPoItemId] = useState(state.materials[1]?.itemId ?? 'ING-000002');
  const [poQtyBase, setPoQtyBase] = useState('1200');

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supWa, setSupWa] = useState('');

  const canWritePurchase = hasPermission(state.role, 'PURCHASE_WRITE');

  const shortageRecommendations = state.materials
    .map(m => {
      const prodNeed = state.productionPlans
        .filter(p => !p.usagePosted)
        .flatMap(p => p.requirements)
        .filter(r => r.itemId === m.itemId)
        .reduce((s, r) => s + r.requiredQtyBase, 0);
      const incoming = state.purchases
        .filter(p => !['RECEIVED', 'CANCELLED'].includes(p.status))
        .flatMap(p => p.items)
        .filter(it => it.itemId === m.itemId)
        .reduce((s, it) => s + (it.orderedQtyBase - it.receivedQtyBase), 0);
      const recommended = Math.max(
        0,
        prodNeed + m.minStockBase - m.currentStockBase - incoming
      );
      const supplier =
        state.suppliers.find(s => s.supplierId === m.defaultSupplierId)?.name ?? '—';
      return {
        material: m,
        prodNeed,
        incoming,
        recommended,
        supplier,
        urgency:
          m.currentStockBase < prodNeed
            ? 'CRITICAL'
            : m.currentStockBase <= m.minStockBase
              ? 'LOW'
              : 'SUFFICIENT'
      };
    })
    .filter(row => row.recommended > 0 || row.urgency !== 'SUFFICIENT');

  const openPurchases = state.purchases.filter(
    p => !['RECEIVED', 'CANCELLED'].includes(p.status)
  );
  const incomingValue = openPurchases.reduce((s, p) => s + p.totalIdr, 0);

  function handleCreatePurchase(e: FormEvent) {
    e.preventDefault();
    const sup = state.suppliers.find(s => s.supplierId === poSupplierId);
    const mat = state.materials.find(m => m.itemId === poItemId);
    if (!sup || !mat) return;
    const qty = Number(poQtyBase) || 1000;
    const total = Math.round(qty * mat.avgCostBase);
    onAddPurchase({
      purchaseId: `PUR-202611-00000${state.purchases.length + 1}`,
      supplierId: sup.supplierId,
      supplierName: sup.name,
      purchaseDate: '2026-11-04',
      totalIdr: total,
      receivingStatus: 'UNRECEIVED',
      status: 'ORDERED',
      items: [
        {
          purchaseItemId: `PUI-00000${state.purchases.length + 5}`,
          itemId: mat.itemId,
          materialName: mat.name,
          itemType: mat.itemType,
          orderedQtyBase: qty,
          receivedQtyBase: 0,
          baseUnit: mat.baseUnit,
          unitCostIdr: mat.avgCostBase,
          lineTotalIdr: total
        }
      ]
    });
    setShowPurchaseModal(false);
    setTab('purchases');
    onToast('Purchase Order dibuat', `PO ke ${sup.name} sebesar ${formatIDR(total)} berhasil dibuat.`, 'success');
  }

  function handleCreateSupplier(e: FormEvent) {
    e.preventDefault();
    if (!supName.trim()) return;
    onAddSupplier({
      supplierId: `SUP-00000${state.suppliers.length + 1}`,
      name: supName.trim(),
      contactName: supContact.trim() || 'Admin Sales',
      whatsapp: supWa.trim() || '08120000000',
      leadTimeDays: 2,
      minimumOrderIdr: 250000,
      status: 'ACTIVE'
    });
    setSupName('');
    setSupContact('');
    setSupWa('');
    setShowSupplierModal(false);
    onToast('Supplier ditambahkan', `${supName} masuk ke daftar Supplier Master.`, 'success');
  }

  return (
    <section className="page purchasing-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">shopping_cart</span>
        </div>
        <div className="module-copy">
          <h2>Purchasing</h2>
          <p>
            Turn production and reorder signals into supplier purchases, receive goods into the
            inventory ledger, and maintain material price history without duplicating stock input.
          </p>
        </div>
      </div>

      <div className="purchasing-toolbar">
        <div className="product-tabs" role="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['shortages', 'To Buy'],
              ['purchases', 'Purchases'],
              ['suppliers', 'Suppliers'],
              ['prices', 'Price History']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`product-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              onToast('Purchasing disegarkan', 'Rekomendasi pengadaan diperbarui.', 'info')
            }
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
          {canWritePurchase && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowPurchaseModal(true)}
            >
              <span className="material-symbols-outlined">add_shopping_cart</span> Purchase
            </button>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <section className="purchasing-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">To Buy</div>
              <div className="card-value">{shortageRecommendations.length}</div>
              <div className="card-help">Shortage / reorder signals</div>
            </article>
            <article className="card">
              <div className="card-label">Open Purchases</div>
              <div className="card-value">{openPurchases.length}</div>
              <div className="card-help">Draft, ordered, or partial</div>
            </article>
            <article className="card">
              <div className="card-label">Incoming Value</div>
              <div className="card-value">{formatIDR(incomingValue)}</div>
              <div className="card-help">Open supplier purchases</div>
            </article>
            <article className="card pink">
              <div className="card-label">Suppliers</div>
              <div className="card-value">{state.suppliers.length}</div>
              <div className="card-help">Active supplier master</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Shortage → Stock</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                One purchasing flow
              </h3>
              <div className="purchasing-flow">
                <span>Production Requirement + Minimum Stock</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Subtract Current Stock + Incoming Purchase</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Recommended To Buy</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Supplier Purchase</span>
                <span className="material-symbols-outlined">arrow_downward</span>
                <span>Receive Goods → Inventory Movement</span>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Cost update</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Receiving updates material cost
              </h3>
              <p className="page-subtitle">
                A goods receipt updates latest cost and weighted-average base-unit cost, then
                refreshes Product COGS for active base recipes using that material.
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'shortages' && (
        <section className="purchasing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Procurement Signal</div>
              <h3 className="section-title">Recommended To Buy</h3>
              <p className="section-copy">
                Recommendation = active unconsumed production requirement + minimum stock − current
                stock − outstanding incoming purchases.
              </p>
            </div>
            {canWritePurchase && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowPurchaseModal(true)}
              >
                <span className="material-symbols-outlined">playlist_add</span> Build Purchase
              </button>
            )}
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Urgency</th>
                  <th className="num">Current</th>
                  <th className="num">Production Need</th>
                  <th className="num">Incoming</th>
                  <th className="num">Min Stock</th>
                  <th className="num">Recommended</th>
                  <th>Default Supplier</th>
                </tr>
              </thead>
              <tbody>
                {shortageRecommendations.map(row => (
                  <tr key={row.material.itemId}>
                    <td>
                      <strong>{row.material.name}</strong>
                    </td>
                    <td>
                      <StatusPill status={row.urgency} />
                    </td>
                    <td className="num">
                      {formatNumber(row.material.currentStockBase)} {row.material.baseUnit}
                    </td>
                    <td className="num">
                      {formatNumber(row.prodNeed)} {row.material.baseUnit}
                    </td>
                    <td className="num">
                      {formatNumber(row.incoming)} {row.material.baseUnit}
                    </td>
                    <td className="num">
                      {formatNumber(row.material.minStockBase)} {row.material.baseUnit}
                    </td>
                    <td className="num">
                      <strong>
                        {formatNumber(row.recommended)} {row.material.baseUnit}
                      </strong>
                    </td>
                    <td>{row.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'purchases' && (
        <section className="purchasing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Supplier Orders</div>
              <h3 className="section-title">Purchases</h3>
              <p className="section-copy">
                Draft purchase → Ordered → partial/full receiving. Receiving appends PURCHASE_RECEIPT
                to Inventory Movements once.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Purchase</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Receiving</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.purchases.map(po => (
                  <tr key={po.purchaseId}>
                    <td>
                      <strong>{po.purchaseId}</strong>
                      <div>
                        <small>{po.items.map(it => it.materialName).join(', ')}</small>
                      </div>
                    </td>
                    <td>{po.supplierName}</td>
                    <td>{po.purchaseDate}</td>
                    <td className="num">{po.items.length}</td>
                    <td className="num">{formatIDR(po.totalIdr)}</td>
                    <td>
                      <StatusPill status={po.receivingStatus} />
                    </td>
                    <td>
                      <StatusPill status={po.status} />
                    </td>
                    <td>
                      {canWritePurchase && po.status !== 'RECEIVED' && (
                        <button
                          type="button"
                          className="primary-btn compact-btn"
                          onClick={() => onReceivePurchase(po.purchaseId)}
                        >
                          Receive Goods
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'suppliers' && (
        <section className="purchasing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Supplier Master</div>
              <h3 className="section-title">Suppliers</h3>
            </div>
            {canWritePurchase && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowSupplierModal(true)}
              >
                <span className="material-symbols-outlined">person_add</span> Supplier
              </button>
            )}
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th>WhatsApp</th>
                  <th className="num">Lead Time</th>
                  <th className="num">Minimum Order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.suppliers.map(s => (
                  <tr key={s.supplierId}>
                    <td>
                      <strong>{s.name}</strong> ({s.supplierId})
                    </td>
                    <td>{s.contactName}</td>
                    <td>{s.whatsapp}</td>
                    <td className="num">{s.leadTimeDays} hari</td>
                    <td className="num">{formatIDR(s.minimumOrderIdr)}</td>
                    <td>
                      <StatusPill status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'prices' && (
        <section className="purchasing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Cost Intelligence</div>
              <h3 className="section-title">Material Price History</h3>
              <p className="section-copy">Derived from Purchase Items.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Material</th>
                  <th>Supplier</th>
                  <th className="num">Quantity</th>
                  <th className="num">Line Total</th>
                  <th className="num">Cost / Base Unit</th>
                  <th>Purchase</th>
                </tr>
              </thead>
              <tbody>
                {state.purchases.flatMap(po =>
                  po.items.map(it => (
                    <tr key={it.purchaseItemId}>
                      <td>{po.purchaseDate}</td>
                      <td>
                        <strong>{it.materialName}</strong>
                      </td>
                      <td>{po.supplierName}</td>
                      <td className="num">
                        {formatNumber(it.orderedQtyBase)} {it.baseUnit}
                      </td>
                      <td className="num">{formatIDR(it.lineTotalIdr)}</td>
                      <td className="num">
                        {formatIDR(it.unitCostIdr)}/{it.baseUnit}
                      </td>
                      <td>{po.purchaseId}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Purchase Order</div>
                <h3 className="section-title">Buat Purchase Order Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPurchaseModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreatePurchase}>
              <label className="form-field span-2">
                <span>Supplier</span>
                <select value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)}>
                  {state.suppliers.map(s => (
                    <option key={s.supplierId} value={s.supplierId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Material</span>
                <select value={poItemId} onChange={e => setPoItemId(e.target.value)}>
                  {state.materials.map(m => (
                    <option key={m.itemId} value={m.itemId}>
                      {m.name} ({m.baseUnit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Kuantitas (Base Unit)</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={poQtyBase}
                  onChange={e => setPoQtyBase(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Supplier Master</div>
                <h3 className="section-title">Tambah Supplier</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowSupplierModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateSupplier}>
              <label className="form-field span-2">
                <span>Nama Perusahaan Supplier</span>
                <input
                  required
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  placeholder="Misal: PT Sukanda Djaya"
                />
              </label>
              <label className="form-field">
                <span>Nama Kontak</span>
                <input
                  required
                  value={supContact}
                  onChange={e => setSupContact(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>WhatsApp</span>
                <input required value={supWa} onChange={e => setSupWa(e.target.value)} />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowSupplierModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
