import { useState, type FormEvent } from 'react';
import { formatIDR, formatNumber } from '../domain/calculators';
import { hasPermission, type RouteId } from '../domain/navigation';
import type { AppPreviewState, BusinessTargetRecord } from '../state/previewData';
import { BarChart, LineChart, StatusPill } from '../components/Charts';

export function ExecutivePage({
  state,
  onNavigate,
  onOpenNewOrder,
  onUpdatePeriod,
  onToast
}: {
  state: AppPreviewState;
  onNavigate: (route: RouteId) => void;
  onOpenNewOrder: () => void;
  onUpdatePeriod: (start: string, end: string) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [periodStart, setPeriodStart] = useState(state.periodStart);
  const [periodEnd, setPeriodEnd] = useState(state.periodEnd);

  const canSeeProfit = hasPermission(state.role, 'PNL_READ');

  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const operatingRevenue = completedOrders.reduce((sum, o) => sum + (o.grandTotal - o.tax), 0);
  const aov = completedOrders.length > 0 ? Math.round(operatingRevenue / completedOrders.length) : 0;

  const cashIn = state.transactions
    .filter(t => t.paymentMethod !== 'NON_CASH')
    .reduce((sum, t) => sum + t.amountIn, 0);
  const cashOut = state.transactions
    .filter(t => t.paymentMethod !== 'NON_CASH')
    .reduce((sum, t) => sum + t.amountOut, 0);
  const netCash = cashIn - cashOut;

  const totalCogs = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.unitCogsSnapshot * it.quantity, 0),
    0
  );
  const totalExpenses = state.expenses
    .filter(e => e.status === 'POSTED')
    .reduce((sum, e) => sum + e.amount, 0);
  const operatingProfit = operatingRevenue - totalCogs - totalExpenses;
  const operatingMargin =
    operatingRevenue > 0 ? Math.round((operatingProfit / operatingRevenue) * 100) : 0;

  const dueToday = state.orders.filter(
    o => o.fulfillmentDate === '2026-11-04' && !['COMPLETED', 'CANCELLED'].includes(o.status)
  ).length;

  const activePlans = state.productionPlans.filter(p => p.status !== 'COMPLETED').length;
  const shortageLines = state.productionPlans
    .flatMap(p => p.requirements)
    .filter(r => r.status === 'SHORTAGE').length;
  const lowOrOutStock = state.materials.filter(m => m.currentStockBase <= m.minStockBase).length;
  const openPurchases = state.purchases.filter(
    p => !['RECEIVED', 'CANCELLED'].includes(p.status)
  ).length;

  const buyers = state.customers.filter(c => c.completedOrders > 0);
  const repeatBuyers = buyers.filter(c => c.completedOrders >= 2);
  const repeatRate = buyers.length > 0 ? Math.round((repeatBuyers.length / buyers.length) * 100) : 0;
  const vipCount = state.customers.filter(c => c.segment === 'VIP').length;
  const dormantCount = state.customers.filter(c => c.segment === 'DORMANT').length;

  const mktSpend = state.expenses
    .filter(e => e.status === 'POSTED' && e.marketingCampaignId)
    .reduce((sum, e) => sum + e.amount, 0);
  const attributedOrders = state.orders.filter(
    o => o.status !== 'CANCELLED' && o.attributedCampaignId
  );
  const attributedRevenue = completedOrders
    .filter(o => o.attributedCampaignId)
    .reduce((sum, o) => sum + (o.grandTotal - o.tax), 0);
  const roas = mktSpend > 0 ? `${(attributedRevenue / mktSpend).toFixed(2)}×` : '—';
  const nonCancelledOrders = state.orders.filter(o => o.status !== 'CANCELLED');
  const coveragePct =
    nonCancelledOrders.length > 0
      ? Math.round((attributedOrders.length / nonCancelledOrders.length) * 100)
      : 0;

  const pipelineCounts = [
    { key: 'WAITING_PAYMENT', label: 'Waiting Pay' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'SCHEDULED', label: 'Scheduled' },
    { key: 'IN_PRODUCTION', label: 'In Prod' },
    { key: 'READY', label: 'Ready' },
    { key: 'ON_DELIVERY', label: 'Delivery' }
  ].map(stage => ({
    ...stage,
    count: state.orders.filter(o => o.status === stage.key).length
  }));

  function handleApplyPeriod(e: FormEvent) {
    e.preventDefault();
    onUpdatePeriod(periodStart, periodEnd);
    onToast('Periode diperbarui', `Menampilkan snapshot ${periodStart} s/d ${periodEnd}`, 'info');
  }

  return (
    <section className="page executive-page route-motion-enter">
      <div className="module-banner executive-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">space_dashboard</span>
        </div>
        <div className="module-copy">
          <h2>Executive</h2>
          <p>
            One-screen view of business performance, order flow, operational risk, customers,
            marketing, and targets.
          </p>
        </div>
        <div className="inline-actions">
          <button type="button" className="primary-btn" onClick={onOpenNewOrder}>
            <span className="material-symbols-outlined">add_shopping_cart</span> New Order
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onToast('Executive disegarkan', 'Seluruh metrik dihitung ulang dari ledger.', 'info')}
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
        </div>
      </div>

      <article className="card executive-period-card">
        <form className="report-period-form" onSubmit={handleApplyPeriod}>
          <div>
            <div className="page-eyebrow">Review Period</div>
            <h3 className="section-title">Business snapshot</h3>
          </div>
          <label>
            <span>From</span>
            <input
              type="date"
              name="period_start"
              required
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              name="period_end"
              required
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
            />
          </label>
          <button type="submit" className="secondary-btn">
            Apply
          </button>
        </form>
      </article>

      <div className="executive-content">
        <section>
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Financial Pulse</div>
              <h3 className="section-title">Current period</h3>
            </div>
          </div>
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Operating Revenue</div>
              <div className="card-value">{formatIDR(operatingRevenue)}</div>
              <div className="card-help">Completed orders · tax excluded</div>
            </article>
            <article className="card">
              <div className="card-label">Completed Orders</div>
              <div className="card-value">{completedOrders.length}</div>
              <div className="card-help">AOV {formatIDR(aov)}</div>
            </article>
            <article className="card">
              <div className="card-label">Net Cash Movement</div>
              <div className="card-value">{formatIDR(netCash)}</div>
              <div className="card-help">Cash in − cash out</div>
            </article>
            {canSeeProfit ? (
              <article className="card pink">
                <div className="card-label">Operating Profit</div>
                <div className="card-value">{formatIDR(operatingProfit)}</div>
                <div className="card-help">{operatingMargin}% margin</div>
              </article>
            ) : (
              <article className="card pink">
                <div className="card-label">Orders Due Today</div>
                <div className="card-value">{dueToday}</div>
                <div className="card-help">Open orders with today fulfillment</div>
              </article>
            )}
          </div>
        </section>

        <section className="grid grid-2 executive-growth-grid">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Growth</div>
                <h3 className="section-title">Operating Revenue</h3>
              </div>
            </div>
            <LineChart
              ariaLabel="Operating Revenue Trend"
              currency
              points={state.dailyMetrics.map(d => ({ label: d.date, value: d.revenue }))}
            />
          </article>
          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Growth</div>
                <h3 className="section-title">Completed Orders</h3>
              </div>
            </div>
            <BarChart
              points={state.dailyMetrics.map(d => ({ label: d.date, value: d.completed }))}
            />
          </article>
        </section>

        <section className="grid grid-2">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Order Pipeline</div>
                <h3 className="section-title">What is moving now</h3>
              </div>
              <button
                type="button"
                className="secondary-btn compact-btn"
                onClick={() => onNavigate('orders')}
              >
                Open Orders
              </button>
            </div>
            <div className="executive-pipeline">
              {pipelineCounts.map(stage => (
                <div key={stage.key} className="experience-flow-step">
                  <strong>{stage.count}</strong>
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card cream">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Needs Attention</div>
                <h3 className="section-title">Exceptions first</h3>
              </div>
            </div>
            <div className="system-diagnostic-list">
              <div className="experience-list-row">
                <div>
                  <strong>Kekurangan Bahan Produksi ({shortageLines} item)</strong>
                  <span>Uji Ceremonial Matcha Powder kurang 45 g untuk PPL-202611-000001</span>
                </div>
                <StatusPill status={shortageLines > 0 ? 'SHORTAGE' : 'HEALTHY'} />
              </div>
              <div className="experience-list-row">
                <div>
                  <strong>Stok di Bawah Minimum ({lowOrOutStock} material)</strong>
                  <span>Savoiardi Ladyfinger, Uji Matcha, dan Thermal Bag perlu restock</span>
                </div>
                <StatusPill status={lowOrOutStock > 0 ? 'LOW' : 'HEALTHY'} />
              </div>
              <div className="experience-list-row">
                <div>
                  <strong>Menunggu Pelunasan ({state.invoices.filter(i => i.remainingAmount > 0).length} invoice)</strong>
                  <span>Total piutang aktif {formatIDR(state.invoices.reduce((s, i) => s + i.remainingAmount, 0))}</span>
                </div>
                <StatusPill status="WAITING_PAYMENT" />
              </div>
            </div>
          </article>
        </section>

        <section>
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Operating Health</div>
              <h3 className="section-title">Production, inventory &amp; purchasing</h3>
            </div>
          </div>
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Active Plans</div>
              <div className="card-value">{activePlans}</div>
              <div className="card-help">Planned / in progress</div>
            </article>
            <article className="card">
              <div className="card-label">Shortage Lines</div>
              <div className="card-value">{shortageLines}</div>
              <div className="card-help">Active production requirements</div>
            </article>
            <article className="card">
              <div className="card-label">Low / Out Stock</div>
              <div className="card-value">{lowOrOutStock}</div>
              <div className="card-help">Materials needing attention</div>
            </article>
            <article className="card">
              <div className="card-label">Open Purchases</div>
              <div className="card-value">{openPurchases}</div>
              <div className="card-help">Not received / cancelled</div>
            </article>
          </div>
        </section>

        <section className="grid grid-2">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Customers</div>
                <h3 className="section-title">Relationship health</h3>
              </div>
              <button
                type="button"
                className="secondary-btn compact-btn"
                onClick={() => onNavigate('customers')}
              >
                Open CRM
              </button>
            </div>
            <div className="grid grid-2 executive-mini-grid">
              <div>
                <span>Repeat Rate</span>
                <strong>{repeatRate}%</strong>
              </div>
              <div>
                <span>VIP</span>
                <strong>{vipCount}</strong>
              </div>
              <div>
                <span>Dormant</span>
                <strong>{dormantCount}</strong>
              </div>
              <div>
                <span>Customer AOV</span>
                <strong>{formatIDR(aov)}</strong>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Marketing</div>
                <h3 className="section-title">Attributed performance</h3>
              </div>
              <button
                type="button"
                className="secondary-btn compact-btn"
                onClick={() => onNavigate('marketing')}
              >
                Open Marketing
              </button>
            </div>
            <div className="grid grid-2 executive-mini-grid">
              <div>
                <span>Spend</span>
                <strong>{formatIDR(mktSpend)}</strong>
              </div>
              <div>
                <span>Attributed Revenue</span>
                <strong>{formatIDR(attributedRevenue)}</strong>
              </div>
              <div>
                <span>ROAS</span>
                <strong>{roas}</strong>
              </div>
              <div>
                <span>Coverage</span>
                <strong>{coveragePct}%</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-2">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Targets</div>
                <h3 className="section-title">Target vs actual</h3>
              </div>
              <button
                type="button"
                className="secondary-btn compact-btn"
                onClick={() => onNavigate('business')}
              >
                Open Business
              </button>
            </div>
            <div className="system-diagnostic-list">
              {state.targets.map(t => {
                const pct = t.targetValue > 0 ? Math.round((t.actualValue / t.targetValue) * 100) : 0;
                return (
                  <div key={t.targetId} className="experience-list-row">
                    <div>
                      <strong>{t.metricLabel}</strong>
                      <span>
                        {t.unit === 'IDR'
                          ? `${formatIDR(t.actualValue)} / ${formatIDR(t.targetValue)}`
                          : `${formatNumber(t.actualValue)} / ${formatNumber(t.targetValue)}`}{' '}
                        ({pct}%)
                      </span>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                );
              })}
            </div>
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Recent Orders</div>
                <h3 className="section-title">Latest activity</h3>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {state.orders.slice(0, 5).map(o => (
                    <tr key={o.orderId}>
                      <td>
                        <strong>{o.orderId}</strong>
                      </td>
                      <td>{o.customerName}</td>
                      <td>
                        <StatusPill status={o.status} />
                      </td>
                      <td className="num">{formatIDR(o.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}

export function BusinessPage({
  state,
  onAddTarget,
  onToast
}: {
  state: AppPreviewState;
  onAddTarget: (target: BusinessTargetRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'targets' | 'channels' | 'context'>('overview');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [metricLabel, setMetricLabel] = useState('Operating Revenue (Des)');
  const [targetValue, setTargetValue] = useState('20000000');

  const canSeeRevenue = hasPermission(state.role, 'REPORT_READ') || hasPermission(state.role, 'PNL_READ');
  const canEditTargets = hasPermission(state.role, 'BUSINESS_UPDATE');

  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const operatingRevenue = completedOrders.reduce((sum, o) => sum + (o.grandTotal - o.tax), 0);

  const channelMap = new Map<string, { orders: number; completed: number; revenue: number }>();
  for (const ch of state.settings.salesChannels) {
    channelMap.set(ch, { orders: 0, completed: 0, revenue: 0 });
  }
  for (const o of state.orders) {
    if (o.status === 'CANCELLED') continue;
    const row = channelMap.get(o.sourceChannel) ?? { orders: 0, completed: 0, revenue: 0 };
    row.orders += 1;
    if (o.status === 'COMPLETED') {
      row.completed += 1;
      row.revenue += o.grandTotal - o.tax;
    }
    channelMap.set(o.sourceChannel, row);
  }
  const channelRows = Array.from(channelMap.entries()).filter(([, v]) => v.orders > 0);

  function submitTarget(e: FormEvent) {
    e.preventDefault();
    const num = Number(targetValue) || 0;
    if (num <= 0) return;
    onAddTarget({
      targetId: `TGT-00000${state.targets.length + 1}`,
      metricKey: 'OPERATING_REVENUE',
      metricLabel,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
      targetValue: num,
      actualValue: operatingRevenue,
      unit: 'IDR',
      status: 'ON_TRACK'
    });
    setShowTargetModal(false);
    onToast('Target ditambahkan', `${metricLabel} berhasil disimpan.`, 'success');
  }

  return (
    <section className="page business-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">monitoring</span>
        </div>
        <div className="module-copy">
          <h2>Business</h2>
          <p>
            Role-aware business health, targets, channel mix, and the operating context used by
            Orders, Payments, and fulfillment.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onToast('Business disegarkan', 'Data Business Health diperbarui.', 'info')}
        >
          <span className="material-symbols-outlined">refresh</span> Refresh
        </button>
      </div>

      <div className="business-toolbar">
        <div className="product-tabs" role="tablist">
          {(['overview', 'targets', 'channels', 'context'] as const).map(t => (
            <button
              key={t}
              type="button"
              className={`product-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'overview'
                ? 'Overview'
                : t === 'targets'
                  ? 'Targets'
                  : t === 'channels'
                    ? 'Channels'
                    : 'Operating Context'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <section className="business-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Total Orders</div>
              <div className="card-value">{state.orders.length}</div>
              <div className="card-help">Within active review window</div>
            </article>
            <article className="card">
              <div className="card-label">Completed Orders</div>
              <div className="card-value">{completedOrders.length}</div>
              <div className="card-help">Fulfilled &amp; settled</div>
            </article>
            <article className="card">
              <div className="card-label">Active Campaigns</div>
              <div className="card-value">
                {state.preorderCampaigns.filter(c => ['OPEN', 'ALMOST_FULL'].includes(c.status)).length}
              </div>
              <div className="card-help">Pre-order drops open</div>
            </article>
            <article className="card pink">
              <div className="card-label">
                {canSeeRevenue ? 'Operating Revenue' : 'Production Plans'}
              </div>
              <div className="card-value">
                {canSeeRevenue ? formatIDR(operatingRevenue) : state.productionPlans.length}
              </div>
              <div className="card-help">
                {canSeeRevenue ? 'Role-authorized financial metric' : 'Role-scoped operational view'}
              </div>
            </article>
          </div>

          <div className="grid grid-2 business-growth-grid">
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">
                    {canSeeRevenue ? 'Daily Operating Revenue' : 'Daily Order Volume'}
                  </h3>
                </div>
              </div>
              <LineChart
                ariaLabel="Primary Business Trend"
                currency={canSeeRevenue}
                points={state.dailyMetrics.map(d => ({
                  label: d.date,
                  value: canSeeRevenue ? d.revenue : d.orders
                }))}
              />
            </article>
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">Orders by Channel</h3>
                </div>
              </div>
              <BarChart
                points={channelRows.map(([ch, v]) => ({ label: ch, value: v.orders }))}
              />
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card">
              <div className="page-eyebrow">Business Health</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Role-aware view ({state.role})
              </h3>
              <p className="page-subtitle">
                Menampilkan indikator kesehatan bisnis yang disesuaikan dengan hak akses role{' '}
                <strong>{state.role}</strong>. Detail sensitif P&amp;L hanya dibuka untuk OWNER dan
                FINANCE.
              </p>
            </article>
            <article className="card cream">
              <div className="page-eyebrow">Target Discipline</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Measure against an explicit target
              </h3>
              <p className="page-subtitle">
                Targets use the canonical BUSINESS_TARGETS table and actuals from the same reporting
                definitions used across Finance, Marketing, Production, and Reports.
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'targets' && (
        <section className="business-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Target vs Actual</div>
              <h3 className="section-title">Business Targets</h3>
            </div>
            {canEditTargets && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowTargetModal(true)}
              >
                <span className="material-symbols-outlined">add</span> Target
              </button>
            )}
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Period</th>
                  <th className="num">Target</th>
                  <th className="num">Actual</th>
                  <th className="num">Achievement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.targets.map(t => {
                  const pct =
                    t.targetValue > 0 ? Math.round((t.actualValue / t.targetValue) * 100) : 0;
                  return (
                    <tr key={t.targetId}>
                      <td>
                        <strong>{t.metricLabel}</strong>
                      </td>
                      <td>
                        {t.periodStart} → {t.periodEnd}
                      </td>
                      <td className="num">
                        {t.unit === 'IDR' ? formatIDR(t.targetValue) : formatNumber(t.targetValue)}
                      </td>
                      <td className="num">
                        {t.unit === 'IDR' ? formatIDR(t.actualValue) : formatNumber(t.actualValue)}
                      </td>
                      <td className="num">{pct}%</td>
                      <td>
                        <StatusPill status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'channels' && (
        <section className="business-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Sales Channels</div>
              <h3 className="section-title">Where orders come from</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th className="num">Orders</th>
                  <th className="num">Completed</th>
                  {canSeeRevenue && <th className="num">Operating Revenue</th>}
                </tr>
              </thead>
              <tbody>
                {channelRows.map(([ch, v]) => (
                  <tr key={ch}>
                    <td>
                      <strong>{ch}</strong>
                    </td>
                    <td className="num">{v.orders}</td>
                    <td className="num">{v.completed}</td>
                    {canSeeRevenue && <td className="num">{formatIDR(v.revenue)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'context' && (
        <section className="business-panel">
          <div className="grid grid-2">
            <article className="card">
              <div className="page-eyebrow">Sales Channels</div>
              <div className="settings-placeholder-list" style={{ marginTop: 12 }}>
                {state.settings.salesChannels.map(ch => (
                  <span key={ch} className="status-pill neutral">
                    {ch}
                  </span>
                ))}
              </div>
            </article>
            <article className="card">
              <div className="page-eyebrow">Fulfillment Types</div>
              <div className="settings-placeholder-list" style={{ marginTop: 12 }}>
                {state.settings.fulfillmentTypes.map(ft => (
                  <span key={ft} className="status-pill neutral">
                    {ft}
                  </span>
                ))}
              </div>
            </article>
            <article className="card">
              <div className="page-eyebrow">Payment Methods</div>
              <div className="settings-placeholder-list" style={{ marginTop: 12 }}>
                {state.settings.paymentMethods.map(pm => (
                  <span key={pm} className="status-pill neutral">
                    {pm}
                  </span>
                ))}
              </div>
            </article>
            <article className="card cream">
              <div className="page-eyebrow">System Context</div>
              <div className="settings-system-list">
                <div>
                  <span>Business</span>
                  <strong>{state.settings.businessName}</strong>
                </div>
                <div>
                  <span>Timezone</span>
                  <strong>{state.settings.timezone}</strong>
                </div>
                <div>
                  <span>Currency</span>
                  <strong>{state.settings.currency}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {showTargetModal && (
        <div className="modal-overlay" onClick={() => setShowTargetModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Business Target</div>
                <h3 className="section-title">Tambah Target Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowTargetModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={submitTarget}>
              <label className="form-field span-2">
                <span>Nama Target</span>
                <input
                  required
                  value={metricLabel}
                  onChange={e => setMetricLabel(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Nilai Target (IDR)</span>
                <input
                  type="number"
                  required
                  min={1}
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowTargetModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
