import { useState, type FormEvent } from 'react';
import { formatIDR } from '../domain/calculators';
import {
  canTransitionOrder,
  orderStatuses,
  validateBulkOrderSelection,
  type OrderStatus
} from '../domain/orderTransitions';
import { hasPermission } from '../domain/navigation';
import type {
  AppPreviewState,
  CustomerRecord,
  OrderRecord,
  PreorderCampaignRecord
} from '../state/previewData';
import { BarChart, LineChart, StatusPill } from '../components/Charts';

const BULK_NEXT_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: 'WAITING_PAYMENT',
  WAITING_PAYMENT: 'CONFIRMED',
  CONFIRMED: 'SCHEDULED',
  SCHEDULED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'READY',
  READY: 'COMPLETED',
  ON_DELIVERY: 'COMPLETED'
};

export function OrdersPage({
  state,
  onOpenNewOrder,
  onTransitionOrders,
  onAddCampaign,
  onOpenPublicInvoice,
  onOpenReceiptPrint,
  onToast
}: {
  state: AppPreviewState;
  onOpenNewOrder: () => void;
  onTransitionOrders: (orderIds: string[], targetStatus: OrderStatus | 'NEXT') => void;
  onAddCampaign: (campaign: PreorderCampaignRecord) => void;
  onOpenPublicInvoice: (invoiceId: string) => void;
  onOpenReceiptPrint: (invoiceId: string, mode: 'receipt' | 'kitchen') => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'all' | 'today' | 'upcoming' | 'attention' | 'preorders'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<OrderStatus | 'NEXT'>('NEXT');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campCutoff, setCampCutoff] = useState('2026-11-20T18:00');
  const [campProdDate, setCampProdDate] = useState('2026-11-21');
  const [campMaxCap, setCampMaxCap] = useState('25');

  const canWriteOrder =
    hasPermission(state.role, 'ORDER_WRITE') || hasPermission(state.role, 'PRODUCTION_WRITE');

  const filteredOrders = state.orders.filter(o => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (tab === 'today' && o.fulfillmentDate !== '2026-11-04') return false;
    if (tab === 'upcoming' && o.fulfillmentDate <= '2026-11-04') return false;
    if (
      tab === 'attention' &&
      !['WAITING_PAYMENT', 'DRAFT'].includes(o.status) &&
      o.paymentStatus !== 'PARTIAL'
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some(i => i.productTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openOrdersCount = state.orders.filter(
    o => !['COMPLETED', 'CANCELLED'].includes(o.status)
  ).length;
  const waitingPaymentCount = state.orders.filter(o => o.status === 'WAITING_PAYMENT').length;
  const todayCount = state.orders.filter(o => o.createdAt.startsWith('2026-11-04')).length;
  const bookedValue = state.orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  function toggleSelectOrder(orderId: string) {
    setSelectedIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredOrders.map(o => o.orderId);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  }

  function handleBulkApply() {
    const preflight = validateBulkOrderSelection(selectedIds);
    if (!preflight.ok) {
      onToast('Bulk guard', preflight.reason, 'error');
      return;
    }

    const targets = state.orders.filter(o => selectedIds.includes(o.orderId));
    for (const order of targets) {
      const nextStatus: OrderStatus | undefined =
        bulkAction === 'NEXT'
          ? order.status === 'READY' && order.fulfillmentType !== 'PICKUP'
            ? 'ON_DELIVERY'
            : BULK_NEXT_MAP[order.status]
          : bulkAction;

      if (!nextStatus || !canTransitionOrder(order.status, nextStatus)) {
        onToast(
          'Transisi status ditolak',
          `Order ${order.orderId} (${order.status}) tidak dapat pindah ke ${nextStatus ?? 'NEXT'}.`,
          'error'
        );
        return;
      }
    }

    onTransitionOrders(selectedIds, bulkAction);
    setSelectedIds([]);
  }

  function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    if (!campName.trim()) return;
    onAddCampaign({
      campaignId: `PRE-202611-00000${state.preorderCampaigns.length + 1}`,
      name: campName.trim(),
      cutoffAt: `${campCutoff}:00+07:00`,
      productionDate: campProdDate,
      fulfillmentDate: campProdDate,
      capacityUnit: 'ORDERS',
      maxCapacity: Number(campMaxCap) || 25,
      currentBooked: 0,
      status: 'OPEN'
    });
    setCampName('');
    setShowCampaignModal(false);
    onToast('Campaign Pre-Order dibuat', `${campName} siap menerima kuota pesanan.`, 'success');
  }

  return (
    <section className="page orders-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">receipt_long</span>
        </div>
        <div className="module-copy">
          <h2>Orders</h2>
          <p>
            Regular Orders and capacity-controlled Pre-Orders share one transaction engine. Campaign
            quota, cutoff, payment, invoice, fulfillment, production, and customer history remain
            connected to the same Order record.
          </p>
        </div>
      </div>

      <div className="order-toolbar">
        <div className="product-tabs" role="tablist" aria-label="Order views">
          {(
            [
              ['all', 'All Orders'],
              ['today', 'Today'],
              ['upcoming', 'Upcoming'],
              ['attention', 'Need Attention'],
              ['preorders', 'Pre-Orders']
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

        <div className="inline-actions order-toolbar-actions">
          {tab !== 'preorders' && (
            <label className="order-status-filter">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                aria-label="Filter Orders by status"
              >
                <option value="ALL">All Statuses</option>
                {orderStatuses.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            className="secondary-btn"
            onClick={() => onToast('Orders disegarkan', 'Daftar pesanan terbaru dimuat.', 'info')}
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>

          {canWriteOrder && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowCampaignModal(true)}
            >
              <span className="material-symbols-outlined">event_available</span> Campaign
            </button>
          )}

          {canWriteOrder && (
            <button type="button" className="primary-btn" onClick={onOpenNewOrder}>
              <span className="material-symbols-outlined">add_shopping_cart</span> New Order
            </button>
          )}
        </div>
      </div>

      {tab !== 'preorders' && (
        <div className="experience-slot experience-slot-top">
          <div className="experience-filter-bar">
            <label className="experience-filter search">
              <span>Cari Order / Pelanggan / Produk</span>
              <input
                placeholder="Ketik ID order, nama pelanggan, atau produk…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>
            <div className="experience-search-meta">
              Menampilkan {filteredOrders.length} dari {state.orders.length} order
            </div>
          </div>
        </div>
      )}

      {tab !== 'preorders' ? (
        <section>
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Open Orders</div>
              <div className="card-value">{openOrdersCount}</div>
              <div className="card-help">Not completed/cancelled</div>
            </article>
            <article className="card">
              <div className="card-label">Waiting Payment</div>
              <div className="card-value">{waitingPaymentCount}</div>
              <div className="card-help">Operational status</div>
            </article>
            <article className="card">
              <div className="card-label">Today</div>
              <div className="card-value">{todayCount}</div>
              <div className="card-help">Orders created today</div>
            </article>
            <article className="card pink">
              <div className="card-label">Booked Value</div>
              <div className="card-value">{formatIDR(bookedValue)}</div>
              <div className="card-help">Non-cancelled order value</div>
            </article>
          </div>

          <div className="grid grid-2 order-growth-grid">
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">Orders Created</h3>
                </div>
              </div>
              <BarChart
                points={state.dailyMetrics.map(d => ({ label: d.date, value: d.orders }))}
              />
            </article>
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">Booked Value</h3>
                </div>
              </div>
              <LineChart
                ariaLabel="Booked Value Trend"
                currency
                points={state.dailyMetrics.map(d => ({
                  label: d.date,
                  value: d.revenue > 0 ? d.revenue : d.orders * 285000
                }))}
              />
            </article>
          </div>

          {selectedIds.length > 0 && canWriteOrder && (
            <div className="order-bulk-bar">
              <div className="order-bulk-selection">
                <strong>{selectedIds.length} selected (max 100)</strong>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
              <div className="order-bulk-controls">
                <label>
                  <span>Bulk Progress</span>
                  <select
                    value={bulkAction}
                    onChange={e => setBulkAction(e.target.value as OrderStatus | 'NEXT')}
                    aria-label="Bulk Order progress action"
                  >
                    <option value="NEXT">Advance Next Step</option>
                    <option value="CONFIRMED">Move to CONFIRMED</option>
                    <option value="SCHEDULED">Move to SCHEDULED</option>
                    <option value="IN_PRODUCTION">Move to IN_PRODUCTION</option>
                    <option value="READY">Move to READY</option>
                    <option value="ON_DELIVERY">Move to ON_DELIVERY</option>
                    <option value="COMPLETED">Move to COMPLETED</option>
                  </select>
                </label>
                <button type="button" className="primary-btn" onClick={handleBulkApply}>
                  <span className="material-symbols-outlined">double_arrow</span> Apply Progress
                </button>
              </div>
            </div>
          )}

          <div className="table-shell">
            <table className="data-table orders-table">
              <thead>
                <tr>
                  <th className="order-select-cell">
                    <input
                      type="checkbox"
                      aria-label="Select all visible Orders"
                      checked={
                        filteredOrders.length > 0 &&
                        filteredOrders.every(o => selectedIds.includes(o.orderId))
                      }
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Fulfillment</th>
                  <th className="num">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.orderId}>
                    <td className="order-select-cell">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.orderId)}
                        onChange={() => toggleSelectOrder(o.orderId)}
                        aria-label={`Select ${o.orderId}`}
                      />
                    </td>
                    <td>
                      <strong>{o.orderId}</strong>
                      <div>
                        <small>
                          {o.sourceChannel}
                          {o.preorderCampaignId ? ` · ${o.preorderCampaignId}` : ''}
                        </small>
                      </div>
                    </td>
                    <td>
                      <strong>{o.customerName}</strong>
                      <div>
                        <small>{o.customerWhatsapp}</small>
                      </div>
                    </td>
                    <td>
                      {o.items.map(it => (
                        <div key={it.orderItemId}>
                          {it.productTitle} × <strong>{it.quantity}</strong>
                        </div>
                      ))}
                    </td>
                    <td>
                      <strong>{o.fulfillmentType}</strong>
                      <div>
                        <small>{o.fulfillmentDate}</small>
                      </div>
                    </td>
                    <td className="num">
                      <strong>{formatIDR(o.grandTotal)}</strong>
                    </td>
                    <td>
                      <StatusPill status={o.paymentStatus} />
                    </td>
                    <td>
                      <StatusPill status={o.status} />
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() => setSelectedOrder(o)}
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() => onOpenPublicInvoice(o.invoiceId)}
                        >
                          Invoice / WA
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="table-empty">Tidak ada order yang cocok dengan filter ini.</div>
            )}
          </div>
        </section>
      ) : (
        <section>
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Campaigns</div>
              <div className="card-value">{state.preorderCampaigns.length}</div>
              <div className="card-help">All campaign records</div>
            </article>
            <article className="card">
              <div className="card-label">Open</div>
              <div className="card-value">
                {state.preorderCampaigns.filter(c => c.status === 'OPEN').length}
              </div>
              <div className="card-help">Currently bookable</div>
            </article>
            <article className="card">
              <div className="card-label">Almost / Full</div>
              <div className="card-value">
                {state.preorderCampaigns.filter(c => ['ALMOST_FULL', 'FULL'].includes(c.status)).length}
              </div>
              <div className="card-help">Campaigns near or at capacity</div>
            </article>
            <article className="card pink">
              <div className="card-label">Linked Orders</div>
              <div className="card-value">
                {state.orders.filter(o => o.preorderCampaignId && o.status !== 'CANCELLED').length}
              </div>
              <div className="card-help">Orders created through campaigns</div>
            </article>
          </div>

          <div className="preorder-explainer card cream">
            <div>
              <div className="page-eyebrow">Atomic capacity reservation</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                No separate preorder transaction
              </h3>
              <p className="page-subtitle">
                Creating a Pre-Order creates a normal Order with <code>preorder_campaign_id</code>.
                Capacity is checked atomically inside the database transaction before the Order is
                written, preventing overbooking.
              </p>
            </div>
            <div className="preorder-flow">
              <span>Campaign</span>
              <span>→</span>
              <span>Capacity Check</span>
              <span>→</span>
              <span>Order</span>
              <span>→</span>
              <span>Invoice / Payment</span>
            </div>
          </div>

          <div className="section-head">
            <div>
              <div className="page-eyebrow">Campaign Capacity</div>
              <h3 className="section-title">Pre-Order Campaigns</h3>
              <p className="section-copy">
                Capacity is recalculated from linked non-cancelled Orders. Cancelling an unpaid
                Pre-Order releases its capacity automatically.
              </p>
            </div>
            {canWriteOrder && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowCampaignModal(true)}
              >
                <span className="material-symbols-outlined">add</span> New Campaign
              </button>
            )}
          </div>

          <div className="preorder-campaign-grid">
            {state.preorderCampaigns.map(camp => {
              const pct = Math.min(100, Math.round((camp.currentBooked / camp.maxCapacity) * 100));
              return (
                <article key={camp.campaignId} className="card">
                  <div className="section-head">
                    <div>
                      <div className="page-eyebrow">{camp.campaignId}</div>
                      <h4 className="mini-title">{camp.name}</h4>
                    </div>
                    <StatusPill status={camp.status} />
                  </div>
                  <div className="settings-system-list" style={{ marginTop: 10 }}>
                    <div>
                      <span>Cutoff</span>
                      <strong>{camp.cutoffAt.replace('T', ' ').slice(0, 16)} WIB</strong>
                    </div>
                    <div>
                      <span>Production / Fulfillment</span>
                      <strong>
                        {camp.productionDate} / {camp.fulfillmentDate}
                      </strong>
                    </div>
                    <div>
                      <span>Capacity ({camp.capacityUnit})</span>
                      <strong>
                        {camp.currentBooked} / {camp.maxCapacity} ({pct}%)
                      </strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Order Snapshot &amp; Transition</div>
                <h3 className="section-title">
                  {selectedOrder.orderId} · {selectedOrder.customerName}
                </h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div className="settings-system-list">
                <div>
                  <span>Status Order</span>
                  <StatusPill status={selectedOrder.status} />
                </div>
                <div>
                  <span>Status Pembayaran</span>
                  <StatusPill status={selectedOrder.paymentStatus} />
                </div>
                <div>
                  <span>Channel / Fulfillment</span>
                  <strong>
                    {selectedOrder.sourceChannel} · {selectedOrder.fulfillmentType} (
                    {selectedOrder.fulfillmentDate})
                  </strong>
                </div>
              </div>
              <div className="settings-system-list">
                <div>
                  <span>Subtotal Produk (Snapshot)</span>
                  <strong>{formatIDR(selectedOrder.subtotal)}</strong>
                </div>
                <div>
                  <span>Ongkir / Diskon</span>
                  <strong>
                    +{formatIDR(selectedOrder.deliveryFee)} / −{formatIDR(selectedOrder.discount)}
                  </strong>
                </div>
                <div>
                  <span>Grand Total</span>
                  <strong>{formatIDR(selectedOrder.grandTotal)}</strong>
                </div>
              </div>
            </div>

            <div className="table-shell" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item (Snapshot)</th>
                    <th>SKU</th>
                    <th className="num">Qty</th>
                    <th className="num">Unit Price</th>
                    <th className="num">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map(it => (
                    <tr key={it.orderItemId}>
                      <td>
                        <strong>{it.productTitle}</strong>
                        {it.productionNotes && (
                          <div>
                            <small>Note: {it.productionNotes}</small>
                          </div>
                        )}
                      </td>
                      <td>{it.sku}</td>
                      <td className="num">{it.quantity}</td>
                      <td className="num">{formatIDR(it.unitPrice)}</td>
                      <td className="num">{formatIDR(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canWriteOrder && (
              <div style={{ marginBottom: 16 }}>
                <div className="page-eyebrow" style={{ marginBottom: 8 }}>
                  Allowed Status Transitions (TWB_ORDER_TRANSITIONS)
                </div>
                <div className="inline-actions">
                  {orderStatuses
                    .filter(
                      target =>
                        target !== selectedOrder.status &&
                        canTransitionOrder(selectedOrder.status, target)
                    )
                    .map(target => (
                      <button
                        key={target}
                        type="button"
                        className={target === 'CANCELLED' ? 'secondary-btn' : 'primary-btn'}
                        onClick={() => {
                          if (
                            target === 'CANCELLED' &&
                            ['PAID', 'PARTIAL'].includes(selectedOrder.paymentStatus)
                          ) {
                            onToast(
                              'Perlu Refund terlebih dahulu',
                              'Order yang sudah dibayar harus melalui alur Refund di Finance sebelum dibatalkan.',
                              'error'
                            );
                            return;
                          }
                          onTransitionOrders([selectedOrder.orderId], target);
                          setSelectedOrder({ ...selectedOrder, status: target });
                        }}
                      >
                        Move to {target}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="inline-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  const invId = selectedOrder.invoiceId;
                  setSelectedOrder(null);
                  onOpenPublicInvoice(invId);
                }}
              >
                <span className="material-symbols-outlined">share</span> Public Invoice &amp; WA
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  const invId = selectedOrder.invoiceId;
                  setSelectedOrder(null);
                  onOpenReceiptPrint(invId, 'receipt');
                }}
              >
                <span className="material-symbols-outlined">print</span> Print Thermal Receipt (
                {state.settings.receiptPaperSize}mm)
              </button>
              {state.settings.kitchenTicketEnabled && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    const invId = selectedOrder.invoiceId;
                    setSelectedOrder(null);
                    onOpenReceiptPrint(invId, 'kitchen');
                  }}
                >
                  <span className="material-symbols-outlined">restaurant</span> Kitchen Ticket
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCampaignModal && (
        <div className="modal-overlay" onClick={() => setShowCampaignModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Pre-Order Drop</div>
                <h3 className="section-title">Buat Campaign Pre-Order</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCampaignModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateCampaign}>
              <label className="form-field span-2">
                <span>Nama Campaign</span>
                <input
                  required
                  placeholder="Misal: Late November Tiramisu Drop"
                  value={campName}
                  onChange={e => setCampName(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Batas Cutoff</span>
                <input
                  type="datetime-local"
                  required
                  value={campCutoff}
                  onChange={e => setCampCutoff(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Tanggal Produksi &amp; Kirim</span>
                <input
                  type="date"
                  required
                  value={campProdDate}
                  onChange={e => setCampProdDate(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Kapasitas Maksimum (Order)</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={campMaxCap}
                  onChange={e => setCampMaxCap(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCampaignModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export function CustomersPage({
  state,
  onAddCustomer,
  onToast
}: {
  state: AppPreviewState;
  onAddCustomer: (customer: CustomerRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'directory' | 'segments' | 'reactivation'>(
    'overview'
  );
  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const canCreateCustomer = hasPermission(state.role, 'CUSTOMER_WRITE');
  const isLimitedRole =
    state.role === 'MARKETING' || state.role === 'PRODUCTION';

  const buyers = state.customers.filter(c => c.completedOrders > 0);
  const repeatBuyers = buyers.filter(c => c.completedOrders >= 2);
  const repeatRate = buyers.length > 0 ? Math.round((repeatBuyers.length / buyers.length) * 100) : 0;
  const dormantList = state.customers.filter(
    c => c.daysSinceOrder >= state.settings.crmDormantDays
  );
  const totalValue = state.customers.reduce((sum, c) => sum + c.historicalValue, 0);
  const totalCompletedOrders = state.customers.reduce((sum, c) => sum + c.completedOrders, 0);
  const overallAov =
    totalCompletedOrders > 0 ? Math.round(totalValue / totalCompletedOrders) : 0;

  const segmentSummary = (['VIP', 'HIGH_VALUE', 'REPEAT', 'NEW', 'DORMANT'] as const).map(seg => {
    const members = state.customers.filter(c => c.segment === seg);
    const val = members.reduce((s, c) => s + c.historicalValue, 0);
    return {
      segment: seg,
      count: members.length,
      orders: members.reduce((s, c) => s + c.completedOrders, 0),
      value: val,
      avgValue: members.length > 0 ? Math.round(val / members.length) : 0
    };
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) return;
    onAddCustomer({
      customerId: `CUS-00000${state.customers.length + 1}`,
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      segment: 'NEW',
      completedOrders: 0,
      historicalValue: 0,
      aov: 0,
      rfmScore: '1-1-1',
      lastOrderDate: '—',
      daysSinceOrder: 0,
      favoriteProduct: '—',
      topChannel: 'WHATSAPP'
    });
    setName('');
    setWhatsapp('');
    setShowNewModal(false);
    onToast('Pelanggan ditambahkan', `${name} tersimpan di Customer Master.`, 'success');
  }

  return (
    <section className="page customers-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">group</span>
        </div>
        <div className="module-copy">
          <h2>Customers</h2>
          <p>
            Turn completed-order history into repeat-rate, RFM-style segmentation, historical
            customer value, product affinity, purchase cadence, channel preference, and
            dormant/reactivation signals.
          </p>
        </div>
      </div>

      <div className="customer-toolbar">
        <div className="product-tabs" role="tablist">
          {(['overview', 'directory', 'segments', 'reactivation'] as const).map(t => (
            <button
              key={t}
              type="button"
              className={`product-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'overview'
                ? 'Overview'
                : t === 'directory'
                  ? 'Directory'
                  : t === 'segments'
                    ? 'Segments'
                    : 'Reactivation'}
            </button>
          ))}
        </div>

        <div className="inline-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              onToast('CRM diperbarui', 'Skor RFM dan segmen pelanggan telah dihitung ulang.', 'info')
            }
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
          {canCreateCustomer && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowNewModal(true)}
            >
              <span className="material-symbols-outlined">person_add</span> Customer
            </button>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <section className="customer-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Customers</div>
              <div className="card-value">{state.customers.length}</div>
              <div className="card-help">Profiles in customer master</div>
            </article>
            <article className="card">
              <div className="card-label">Repeat Rate</div>
              <div className="card-value">{repeatRate}%</div>
              <div className="card-help">Buyers with 2+ completed orders</div>
            </article>
            <article className="card">
              <div className="card-label">Dormant</div>
              <div className="card-value">{dormantList.length}</div>
              <div className="card-help">Past dormant threshold</div>
            </article>
            <article className="card pink">
              <div className="card-label">Historical Value</div>
              <div className="card-value">{formatIDR(totalValue)}</div>
              <div className="card-help">Completed-order spend</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">RFM-style intelligence</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Relative, not hard-coded rupiah tiers
              </h3>
              <p className="page-subtitle">
                Recency, Frequency, and Monetary scores are calculated relative to the current
                customer cohort. Segment labels are descriptive business signals, not predictive
                lifetime-value claims.
              </p>
              <div className="crm-rfm-flow">
                <span>Recency</span>
                <span>+</span>
                <span>Frequency</span>
                <span>+</span>
                <span>Monetary</span>
                <span>→</span>
                <strong>CRM Segment</strong>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Privacy-aware access</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Insight stays useful with limited access
              </h3>
              <p className="page-subtitle">
                {isLimitedRole
                  ? `Role ${state.role} menggunakan proyeksi terbatas (tanpa catatan finansial internal/bukti pembayaran).`
                  : `Role ${state.role} memiliki akses penuh ke profil dan riwayat belanja pelanggan.`}
              </p>
              <div className="crm-mini-stats">
                <div>
                  <span>Buyers</span>
                  <strong>{buyers.length}</strong>
                </div>
                <div>
                  <span>VIP</span>
                  <strong>{state.customers.filter(c => c.segment === 'VIP').length}</strong>
                </div>
                <div>
                  <span>Completed-order AOV</span>
                  <strong>{formatIDR(overallAov)}</strong>
                </div>
              </div>
            </article>
          </div>

          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Customer Value</div>
                <h3 className="section-title">Top Customers</h3>
                <p className="section-copy">
                  Historical value only: completed-order spend to date.
                </p>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>CRM Segment</th>
                    <th className="num">Completed Orders</th>
                    <th className="num">Historical Value</th>
                    <th className="num">AOV</th>
                    <th>Last Order</th>
                  </tr>
                </thead>
                <tbody>
                  {[...state.customers]
                    .sort((a, b) => b.historicalValue - a.historicalValue)
                    .map(c => (
                      <tr key={c.customerId}>
                        <td>
                          <strong>{c.name}</strong>
                          <div>
                            <small>{c.customerId}</small>
                          </div>
                        </td>
                        <td>
                          <StatusPill status={c.segment} />
                        </td>
                        <td className="num">{c.completedOrders}</td>
                        <td className="num">{formatIDR(c.historicalValue)}</td>
                        <td className="num">{formatIDR(c.aov)}</td>
                        <td>{c.lastOrderDate}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {tab === 'directory' && (
        <section className="customer-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Customer Master</div>
              <h3 className="section-title">Customer Directory</h3>
              <p className="section-copy">
                Directory metrics are recalculated from completed Orders; CRM segment and RFM scores
                are derived live from the current cohort.
              </p>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>WhatsApp</th>
                  <th>CRM Segment</th>
                  <th className="num">Orders</th>
                  <th className="num">Historical Value</th>
                  <th className="num">AOV</th>
                  <th className="num">RFM</th>
                  <th>Recency</th>
                </tr>
              </thead>
              <tbody>
                {state.customers.map(c => (
                  <tr key={c.customerId}>
                    <td>
                      <strong>{c.name}</strong>
                      {!isLimitedRole && c.notes && (
                        <div>
                          <small>{c.notes}</small>
                        </div>
                      )}
                    </td>
                    <td>{c.whatsapp}</td>
                    <td>
                      <StatusPill status={c.segment} />
                    </td>
                    <td className="num">{c.completedOrders}</td>
                    <td className="num">{formatIDR(c.historicalValue)}</td>
                    <td className="num">{formatIDR(c.aov)}</td>
                    <td className="num">{c.rfmScore}</td>
                    <td>{c.daysSinceOrder}d ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'segments' && (
        <section className="customer-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Segmentation</div>
              <h3 className="section-title">CRM Segments</h3>
            </div>
          </div>
          <article className="card">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th className="num">Customers</th>
                    <th className="num">Completed Orders</th>
                    <th className="num">Historical Value</th>
                    <th className="num">Avg Value / Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentSummary.map(s => (
                    <tr key={s.segment}>
                      <td>
                        <StatusPill status={s.segment} />
                      </td>
                      <td className="num">{s.count}</td>
                      <td className="num">{s.orders}</td>
                      <td className="num">{formatIDR(s.value)}</td>
                      <td className="num">{formatIDR(s.avgValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {tab === 'reactivation' && (
        <section className="customer-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Dormant Signal</div>
              <h3 className="section-title">Reactivation Candidates</h3>
              <p className="section-copy">
                Customers with completed-order history whose last completed order is older than{' '}
                <strong>{state.settings.crmDormantDays}</strong> days.
              </p>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Days Since Order</th>
                  <th className="num">Historical Value</th>
                  <th className="num">Orders</th>
                  <th>Favorite Product</th>
                  <th>Top Channel</th>
                </tr>
              </thead>
              <tbody>
                {dormantList.map(c => (
                  <tr key={c.customerId}>
                    <td>
                      <strong>{c.name}</strong> ({c.whatsapp})
                    </td>
                    <td className="num">{c.daysSinceOrder} hari</td>
                    <td className="num">{formatIDR(c.historicalValue)}</td>
                    <td className="num">{c.completedOrders}</td>
                    <td>{c.favoriteProduct}</td>
                    <td>{c.topChannel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Customer Master</div>
                <h3 className="section-title">Tambah Pelanggan Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowNewModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreate}>
              <label className="form-field span-2">
                <span>Nama Lengkap</span>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Misal: Clarissa Putri"
                />
              </label>
              <label className="form-field span-2">
                <span>Nomor WhatsApp</span>
                <input
                  required
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="0812xxxxxxxx"
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowNewModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
