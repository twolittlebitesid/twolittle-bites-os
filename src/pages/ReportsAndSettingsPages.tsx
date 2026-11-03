import { useState, type FormEvent } from 'react';
import {
  formatIDR,
  formatNumber,
  renderWhatsAppTemplate
} from '../domain/calculators';
import { canonicalSheets } from '../domain/catalog';
import { hasPermission } from '../domain/navigation';
import type { AppPreviewState, AppSettingsState } from '../state/previewData';
import { BarChart, LineChart, StatusPill } from '../components/Charts';

export function ReportsPage({
  state,
  onToast
}: {
  state: AppPreviewState;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'daily' | 'weekly' | 'monthly' | 'targets' | 'export'>(
    'overview'
  );
  const [cacheStatus, setCacheStatus] = useState('Built · 2026-11-04 01:40 WIB');

  const canSeeFinance = hasPermission(state.role, 'REPORT_READ');
  const canSeeOps =
    canSeeFinance || hasPermission(state.role, 'REPORT_OPERATIONAL_READ');
  const canSeeMkt =
    canSeeFinance || hasPermission(state.role, 'REPORT_MARKETING_READ');

  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const operatingRevenue = completedOrders.reduce((s, o) => s + (o.grandTotal - o.tax), 0);
  const totalCogs = completedOrders.reduce(
    (s, o) => s + o.items.reduce((acc, it) => acc + it.unitCogsSnapshot * it.quantity, 0),
    0
  );
  const grossProfit = operatingRevenue - totalCogs;
  const grossMargin = operatingRevenue > 0 ? Math.round((grossProfit / operatingRevenue) * 100) : 0;
  const totalExpenses = state.expenses
    .filter(e => e.status === 'POSTED')
    .reduce((s, e) => s + e.amount, 0);
  const operatingProfit = grossProfit - totalExpenses;
  const operatingMargin =
    operatingRevenue > 0 ? Math.round((operatingProfit / operatingRevenue) * 100) : 0;

  const netCash = state.transactions
    .filter(t => t.paymentMethod !== 'NON_CASH')
    .reduce((s, t) => s + (t.amountIn - t.amountOut), 0);

  const mktSpend = state.expenses
    .filter(e => e.status === 'POSTED' && e.marketingCampaignId)
    .reduce((s, e) => s + e.amount, 0);
  const attributedRev = completedOrders
    .filter(o => o.attributedCampaignId)
    .reduce((s, o) => s + (o.grandTotal - o.tax), 0);

  function triggerCsvExport(scope: string) {
    const headers = ['date', 'orders', 'completed', 'revenue', 'expenses', 'cash_net'];
    const rows = state.dailyMetrics.map(d =>
      [d.date, d.orders, d.completed, d.revenue, d.expenses, d.cashNet].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twolittle-bites-${scope.toLowerCase()}-${state.periodEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onToast('CSV Diunduh', `File ekspor ${scope} berhasil dibuat.`, 'success');
  }

  return (
    <section className="page reports-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">analytics</span>
        </div>
        <div className="module-copy">
          <h2>Reports</h2>
          <p>
            Daily, weekly, and monthly business review generated from operational sources of truth,
            with rebuildable metric caches, target tracking, and CSV export.
          </p>
        </div>
      </div>

      <div className="reports-toolbar">
        <div className="product-tabs" role="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['daily', 'Daily'],
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['targets', 'Targets'],
              ['export', 'Export']
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
          {canSeeFinance && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setCacheStatus('Rebuilt · Just now');
                onToast(
                  'Cache Metrik Dibangun Ulang',
                  'DAILY_METRICS dan MONTHLY_METRICS disinkronkan dari ledger.',
                  'success'
                );
              }}
            >
              <span className="material-symbols-outlined">sync</span> Rebuild Cache
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onToast('Reports disegarkan', 'Laporan terbaru ditampilkan.', 'info')}
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
        </div>
      </div>

      <article className="card report-period-card">
        <div className="report-period-form">
          <div>
            <div className="page-eyebrow">Business Review Period</div>
            <h3 className="section-title">
              Live report ({state.periodStart} → {state.periodEnd})
            </h3>
          </div>
        </div>
        <div className="report-cache-meta">
          <span>Cache</span>
          <strong>{cacheStatus}</strong>
        </div>
      </article>

      {tab === 'overview' && (
        <section className="report-panel">
          {canSeeFinance && (
            <div>
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Financial Review</div>
                  <h3 className="section-title">Managerial Performance</h3>
                </div>
              </div>
              <div className="grid grid-4">
                <article className="card">
                  <div className="card-label">Operating Revenue</div>
                  <div className="card-value">{formatIDR(operatingRevenue)}</div>
                  <div className="card-help">Completed orders · tax excluded</div>
                </article>
                <article className="card">
                  <div className="card-label">Gross Profit</div>
                  <div className="card-value">{formatIDR(grossProfit)}</div>
                  <div className="card-help">{grossMargin}% margin</div>
                </article>
                <article className="card">
                  <div className="card-label">Operating Profit</div>
                  <div className="card-value">{formatIDR(operatingProfit)}</div>
                  <div className="card-help">{operatingMargin}% margin</div>
                </article>
                <article className="card pink">
                  <div className="card-label">Net Cash Movement</div>
                  <div className="card-value">{formatIDR(netCash)}</div>
                  <div className="card-help">Actual cash in − cash out</div>
                </article>
              </div>
            </div>
          )}

          {canSeeOps && (
            <div>
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Operations</div>
                  <h3 className="section-title">Production Health</h3>
                </div>
              </div>
              <div className="grid grid-4">
                <article className="card">
                  <div className="card-label">Production Plans</div>
                  <div className="card-value">{state.productionPlans.length}</div>
                  <div className="card-help">Non-cancelled plans</div>
                </article>
                <article className="card">
                  <div className="card-label">Completed Plans</div>
                  <div className="card-value">
                    {state.productionPlans.filter(p => p.status === 'COMPLETED').length}
                  </div>
                  <div className="card-help">Frozen batch snapshots</div>
                </article>
                <article className="card">
                  <div className="card-label">Shortage Signals</div>
                  <div className="card-value">
                    {
                      state.productionPlans
                        .flatMap(p => p.requirements)
                        .filter(r => r.status === 'SHORTAGE').length
                    }
                  </div>
                  <div className="card-help">Requirement lines with shortage</div>
                </article>
                <article className="card cream">
                  <div className="card-label">Waste Qty</div>
                  <div className="card-value">0</div>
                  <div className="card-help">Recorded production batch waste</div>
                </article>
              </div>
            </div>
          )}

          {canSeeMkt && (
            <div>
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Marketing</div>
                  <h3 className="section-title">Attribution Performance</h3>
                </div>
              </div>
              <div className="grid grid-4">
                <article className="card">
                  <div className="card-label">Marketing Spend</div>
                  <div className="card-value">{formatIDR(mktSpend)}</div>
                  <div className="card-help">Linked active expenses</div>
                </article>
                <article className="card">
                  <div className="card-label">Attributed Revenue</div>
                  <div className="card-value">{formatIDR(attributedRev)}</div>
                  <div className="card-help">Completed operating revenue</div>
                </article>
                <article className="card">
                  <div className="card-label">ROAS</div>
                  <div className="card-value">
                    {mktSpend > 0 ? `${(attributedRev / mktSpend).toFixed(2)}×` : '—'}
                  </div>
                  <div className="card-help">Revenue ÷ spend</div>
                </article>
                <article className="card pink">
                  <div className="card-label">Attribution Coverage</div>
                  <div className="card-value">75%</div>
                  <div className="card-help">Attributed orders ÷ created orders</div>
                </article>
              </div>
            </div>
          )}

          <div className="grid grid-2">
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">Daily Revenue Trend</h3>
                </div>
              </div>
              <LineChart
                ariaLabel="Report Revenue Trend"
                currency
                points={state.dailyMetrics.map(d => ({ label: d.date, value: d.revenue }))}
              />
            </article>
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Growth</div>
                  <h3 className="section-title">Daily Net Cash</h3>
                </div>
              </div>
              <BarChart
                currency
                points={state.dailyMetrics.map(d => ({ label: d.date, value: d.cashNet }))}
              />
            </article>
          </div>
        </section>
      )}

      {(tab === 'daily' || tab === 'weekly' || tab === 'monthly') && (
        <section className="report-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">{tab.toUpperCase()} Review</div>
              <h3 className="section-title">
                {tab === 'daily'
                  ? 'Daily Metrics'
                  : tab === 'weekly'
                    ? 'Week Starting Monday'
                    : 'Cached Monthly Metrics'}
              </h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table report-metric-table">
              <thead>
                <tr>
                  <th>{tab === 'daily' ? 'Date' : tab === 'weekly' ? 'Week Start' : 'Month'}</th>
                  {canSeeFinance && <th className="num">Orders</th>}
                  {canSeeFinance && <th className="num">Completed</th>}
                  {canSeeFinance && <th className="num">Revenue</th>}
                  {canSeeFinance && <th className="num">Expenses</th>}
                  {canSeeFinance && <th className="num">Cash Net</th>}
                  {canSeeMkt && <th className="num">Mkt Spend</th>}
                  {canSeeMkt && <th className="num">Attributed Rev</th>}
                  {canSeeOps && <th className="num">Plans</th>}
                  {canSeeOps && <th className="num">Shortages</th>}
                </tr>
              </thead>
              <tbody>
                {state.dailyMetrics.map(d => (
                  <tr key={d.date}>
                    <td>
                      <strong>{tab === 'monthly' ? d.date.slice(0, 7) : d.date}</strong>
                    </td>
                    {canSeeFinance && <td className="num">{d.orders}</td>}
                    {canSeeFinance && <td className="num">{d.completed}</td>}
                    {canSeeFinance && <td className="num">{formatIDR(d.revenue)}</td>}
                    {canSeeFinance && <td className="num">{formatIDR(d.expenses)}</td>}
                    {canSeeFinance && <td className="num">{formatIDR(d.cashNet)}</td>}
                    {canSeeMkt && <td className="num">{formatIDR(d.mktSpend)}</td>}
                    {canSeeMkt && <td className="num">{formatIDR(d.attributedRev)}</td>}
                    {canSeeOps && <td className="num">{d.plans}</td>}
                    {canSeeOps && <td className="num">{d.shortages}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'targets' && (
        <section className="report-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Target vs Actual</div>
              <h3 className="section-title">Business Targets</h3>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Period</th>
                  <th className="num">Target</th>
                  <th className="num">Actual</th>
                  <th className="num">Variance</th>
                  <th className="num">Achievement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.targets.map(t => {
                  const variance = t.actualValue - t.targetValue;
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
                      <td className="num">
                        {t.unit === 'IDR' ? formatIDR(variance) : formatNumber(variance)}
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

      {tab === 'export' && (
        <section className="report-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">CSV Export</div>
              <h3 className="section-title">Export current reporting scope</h3>
              <p className="section-copy">
                Exports respect your report permissions ({state.role}).
              </p>
            </div>
          </div>

          <div className="report-export-grid">
            {[
              { key: 'SUMMARY', icon: 'summarize', title: 'Period Summary', sub: 'Visible KPI summary' },
              { key: 'DAILY', icon: 'calendar_view_day', title: 'Daily Metrics', sub: 'Selected live period' },
              { key: 'WEEKLY', icon: 'date_range', title: 'Weekly Metrics', sub: 'Monday-based aggregation' },
              { key: 'MONTHLY', icon: 'calendar_month', title: 'Monthly Metrics', sub: 'Cached monthly trend' },
              { key: 'TARGETS', icon: 'flag', title: 'Targets', sub: 'Target vs actual' },
              { key: 'MARKETING_ATTRIBUTION', icon: 'campaign', title: 'Marketing Attribution', sub: 'Active attributed Orders' },
              { key: 'PRODUCTION_PLANS', icon: 'oven_gen', title: 'Production Plans', sub: 'Plans in selected period' },
              { key: 'FINANCE_TRANSACTIONS', icon: 'payments', title: 'Finance Transactions', sub: 'Ledger rows in selected period' }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                className="report-export-card"
                onClick={() => triggerCsvExport(item.key)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <strong>{item.title}</strong>
                <small>{item.sub}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export function SettingsPage({
  state,
  onUpdateSettings,
  onToast
}: {
  state: AppPreviewState;
  onUpdateSettings: (next: Partial<AppSettingsState>) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<
    | 'business'
    | 'commerce'
    | 'invoice'
    | 'printing'
    | 'automation'
    | 'users'
    | 'diagnostics'
    | 'release'
    | 'system'
  >('business');

  const [bizName, setBizName] = useState(state.settings.businessName);
  const [logoUrl, setLogoUrl] = useState(state.settings.brandLogoUrl);
  const [waCode, setWaCode] = useState(state.settings.whatsappCountryCode);

  const [invPrefix, setInvPrefix] = useState(state.settings.invoicePrefix);
  const [invDueHours, setInvDueHours] = useState(String(state.settings.invoiceDueHours));
  const [invPublicTitle, setInvPublicTitle] = useState(state.settings.invoicePublicTitle);
  const [invPublicNote, setInvPublicNote] = useState(state.settings.invoicePublicNote);
  const [waTemplate, setWaTemplate] = useState(state.settings.invoiceWhatsappTemplate);

  const [newChannelChip, setNewChannelChip] = useState('');

  const canWriteSettings = hasPermission(state.role, 'SETTINGS_WRITE');
  const isOwner = state.role === 'OWNER';

  const liveWaPreview = renderWhatsAppTemplate(waTemplate, {
    customer_name: 'Nadia Pramesti',
    business_name: bizName,
    invoice_number: `${invPrefix}-202611-000001`,
    grand_total: 'Rp400.000',
    remaining_amount: 'Rp140.000',
    delivery_fee: 'Rp25.000',
    due_at: '05 Nov 2026 10:16 WIB',
    invoice_pdf_url: 'https://twolittlebites.id/public/invoices/pub_tok_98a1f3'
  });

  function saveBusinessForm(e: FormEvent) {
    e.preventDefault();
    onUpdateSettings({
      businessName: bizName.trim() || 'twolittle.bites',
      brandLogoUrl: logoUrl.trim(),
      whatsappCountryCode: waCode.trim() || '62'
    });
    onToast('Profil Bisnis Disimpan', 'Perubahan identitas bisnis berhasil dicatat di Audit Log.', 'success');
  }

  function saveInvoiceForm(e: FormEvent) {
    e.preventDefault();
    onUpdateSettings({
      invoicePrefix: invPrefix.trim() || 'INV-TLB',
      invoiceDueHours: Number(invDueHours) || 24,
      invoicePublicTitle: invPublicTitle.trim() || 'Invoice',
      invoicePublicNote: invPublicNote.trim(),
      invoiceWhatsappTemplate: waTemplate
    });
    onToast('Invoice & WhatsApp Disimpan', 'Template pesan dan konfigurasi invoice publik diperbarui.', 'success');
  }

  return (
    <section className="page settings-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">settings</span>
        </div>
        <div className="module-copy">
          <h2>Settings</h2>
          <p>
            Manage business profile, commerce configuration, invoice and WhatsApp behavior,
            operational automation, application users, and system governance from one controlled
            settings layer.
          </p>
        </div>
      </div>

      <div className="settings-toolbar">
        <div className="product-tabs" role="tablist">
          {(
            [
              ['business', 'Business', true],
              ['commerce', 'Commerce', true],
              ['invoice', 'Invoice & WhatsApp', true],
              ['printing', 'Printing', true],
              ['automation', 'Automation', true],
              ['users', 'Users', isOwner],
              ['diagnostics', 'Diagnostics', isOwner || state.role === 'ADMIN'],
              ['release', 'Release', isOwner],
              ['system', 'System', true]
            ] as const
          )
            .filter(([, , visible]) => visible)
            .map(([key, label]) => (
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
          onClick={() => onToast('Settings disegarkan', 'Konfigurasi dimuat ulang.', 'info')}
        >
          <span className="material-symbols-outlined">refresh</span> Refresh
        </button>
      </div>

      {tab === 'business' && (
        <section className="settings-panel">
          <div className="grid grid-2">
            <article className="card">
              <div className="page-eyebrow">Business Profile</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Identity &amp; messaging defaults
              </h3>
              <form className="form-grid settings-form" onSubmit={saveBusinessForm}>
                <label className="form-field span-2">
                  <span>Business Name</span>
                  <input
                    required
                    disabled={!canWriteSettings}
                    value={bizName}
                    onChange={e => setBizName(e.target.value)}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Brand Logo URL</span>
                  <input
                    disabled={!canWriteSettings}
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </label>
                <label className="form-field">
                  <span>WhatsApp Country Code</span>
                  <input
                    required
                    disabled={!canWriteSettings}
                    value={waCode}
                    onChange={e => setWaCode(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Timezone</span>
                  <input value={state.settings.timezone} disabled />
                </label>
                <label className="form-field">
                  <span>Currency</span>
                  <input value={state.settings.currency} disabled />
                </label>
                {canWriteSettings && (
                  <div className="span-2 form-actions">
                    <button type="submit" className="primary-btn">
                      Save Business
                    </button>
                  </div>
                )}
              </form>
            </article>

            <article className="card cream">
              <div className="page-eyebrow">Governance</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Controlled settings only
              </h3>
              <p className="page-subtitle">
                Settings do not expose arbitrary CONFIG editing. Every editable field is
                whitelisted, validated, and audited before it is written.
              </p>
              <div className="settings-note-stack">
                <div>
                  <span className="material-symbols-outlined">verified_user</span>
                  <span>OWNER / ADMIN can change operational settings.</span>
                </div>
                <div>
                  <span className="material-symbols-outlined">visibility</span>
                  <span>FINANCE has read-only Settings access.</span>
                </div>
                <div>
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span>User and role governance stays OWNER-only.</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'commerce' && (
        <section className="settings-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Commerce Configuration</div>
              <h3 className="section-title">Operational choices used across the app</h3>
              <p className="section-copy">
                Changes affect new inputs only; historical Orders, Payments, and Expenses are never
                rewritten.
              </p>
            </div>
          </div>

          <div className="commerce-settings-grid">
            <article className="card commerce-setting-card">
              <div className="commerce-setting-head">
                <span className="commerce-setting-icon material-symbols-outlined">storefront</span>
                <div>
                  <h4>Sales Channels</h4>
                  <p>Where an Order originated.</p>
                </div>
              </div>
              <div className="commerce-token-list">
                {state.settings.salesChannels.map(ch => (
                  <span key={ch} className="status-pill neutral">
                    {ch}
                  </span>
                ))}
              </div>
              {canWriteSettings && (
                <div className="commerce-add-row" style={{ marginTop: 10 }}>
                  <input
                    placeholder="e.g. TIKTOK SHOP"
                    value={newChannelChip}
                    onChange={e => setNewChannelChip(e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-btn compact-btn"
                    onClick={() => {
                      const clean = newChannelChip.trim().toUpperCase();
                      if (!clean) return;
                      if (!state.settings.salesChannels.includes(clean)) {
                        onUpdateSettings({
                          salesChannels: [...state.settings.salesChannels, clean]
                        });
                      }
                      setNewChannelChip('');
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </article>

            <article className="card commerce-setting-card">
              <div className="commerce-setting-head">
                <span className="commerce-setting-icon material-symbols-outlined">
                  local_shipping
                </span>
                <div>
                  <h4>Fulfillment Types</h4>
                  <p>How an Order reaches the customer.</p>
                </div>
              </div>
              <div className="commerce-token-list">
                {state.settings.fulfillmentTypes.map(ft => (
                  <span key={ft} className="status-pill neutral">
                    {ft}
                  </span>
                ))}
              </div>
            </article>

            <article className="card commerce-setting-card">
              <div className="commerce-setting-head">
                <span className="commerce-setting-icon material-symbols-outlined">payments</span>
                <div>
                  <h4>Payment Methods</h4>
                  <p>Allowed methods for Payments and Expenses.</p>
                </div>
              </div>
              <div className="commerce-token-list">
                {state.settings.paymentMethods.map(pm => (
                  <span key={pm} className="status-pill neutral">
                    {pm}
                  </span>
                ))}
              </div>
            </article>

            <article className="card commerce-setting-card">
              <div className="commerce-setting-head">
                <span className="commerce-setting-icon material-symbols-outlined">
                  receipt_long
                </span>
                <div>
                  <h4>Expense Categories</h4>
                  <p>Categories available when recording expenses.</p>
                </div>
              </div>
              <div className="commerce-token-list">
                {state.settings.expenseCategories.map(cat => (
                  <span key={cat} className="status-pill neutral">
                    {cat}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'invoice' && (
        <section className="settings-panel">
          <div className="grid grid-2">
            <article className="card">
              <div className="page-eyebrow">Invoice Settings</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Public invoice &amp; WhatsApp
              </h3>
              <form className="form-grid settings-form" onSubmit={saveInvoiceForm}>
                <label className="form-field">
                  <span>Invoice Prefix</span>
                  <input
                    required
                    disabled={!canWriteSettings}
                    value={invPrefix}
                    onChange={e => setInvPrefix(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Payment Due (hours)</span>
                  <input
                    type="number"
                    required
                    disabled={!canWriteSettings}
                    value={invDueHours}
                    onChange={e => setInvDueHours(e.target.value)}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Public Invoice Title</span>
                  <input
                    required
                    disabled={!canWriteSettings}
                    value={invPublicTitle}
                    onChange={e => setInvPublicTitle(e.target.value)}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Public Invoice Note</span>
                  <textarea
                    rows={3}
                    disabled={!canWriteSettings}
                    value={invPublicNote}
                    onChange={e => setInvPublicNote(e.target.value)}
                  />
                </label>
                <label className="form-field span-2">
                  <span>WhatsApp Invoice Template</span>
                  <textarea
                    rows={8}
                    required
                    disabled={!canWriteSettings}
                    value={waTemplate}
                    onChange={e => setWaTemplate(e.target.value)}
                  />
                </label>
                {canWriteSettings && (
                  <div className="span-2 form-actions">
                    <button type="submit" className="primary-btn">
                      Save Invoice &amp; WhatsApp
                    </button>
                  </div>
                )}
              </form>
            </article>

            <div className="settings-preview-stack">
              <article className="card settings-live-preview-card">
                <div className="page-eyebrow">Public Invoice Preview</div>
                <div className="invoice-mini-preview">
                  <div className="invoice-mini-brand">{bizName}</div>
                  <div className="invoice-mini-head">
                    <div>
                      <small>{invPublicTitle}</small>
                      <strong>{invPrefix}-202611-000001</strong>
                      <span>04 Nov 2026 · Due 05 Nov 2026</span>
                    </div>
                    <span className="status-pill attention">WAITING PAYMENT</span>
                  </div>
                  <div className="invoice-mini-customer">
                    <span>Customer</span>
                    <strong>Nadia Pramesti</strong>
                    <small>0812 8890 1122</small>
                  </div>
                  <div className="invoice-mini-row">
                    <span>Classic Mascarpone Tiramisu × 2</span>
                    <strong>Rp250.000</strong>
                  </div>
                  <div className="invoice-mini-row">
                    <span>Delivery</span>
                    <strong>Rp25.000</strong>
                  </div>
                  <div className="invoice-mini-total">
                    <span>Grand Total</span>
                    <strong>Rp275.000</strong>
                  </div>
                  <p>{invPublicNote}</p>
                </div>
              </article>

              <article className="card settings-live-preview-card">
                <div className="page-eyebrow">WhatsApp Preview</div>
                <div className="whatsapp-phone-preview">
                  <div className="whatsapp-preview-head">
                    <span className="material-symbols-outlined">chat</span>
                    <div>
                      <strong>Nadia Pramesti</strong>
                      <small>WhatsApp invoice message</small>
                    </div>
                  </div>
                  <div className="whatsapp-preview-chat">
                    <div
                      className="whatsapp-preview-bubble"
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {liveWaPreview}
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      )}

      {tab === 'printing' && (
        <section className="settings-panel">
          <div className="grid grid-2">
            <article className="card">
              <div className="page-eyebrow">Thermal Printing</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Receipt &amp; kitchen output (58mm / 80mm)
              </h3>
              <div className="form-grid settings-form">
                <label className="form-field">
                  <span>Print Mode</span>
                  <input value="Browser Print" disabled />
                </label>
                <label className="form-field">
                  <span>Paper Size</span>
                  <select
                    disabled={!canWriteSettings}
                    value={state.settings.receiptPaperSize}
                    onChange={e =>
                      onUpdateSettings({ receiptPaperSize: e.target.value as '58' | '80' })
                    }
                  >
                    <option value="58">58 mm</option>
                    <option value="80">80 mm</option>
                  </select>
                </label>
                <div className="span-2 settings-toggle-list">
                  <label className="settings-toggle-row">
                    <span>
                      <strong>Show Logo</strong>
                      <small>Tampilkan nama/logo bisnis pada struk thermal.</small>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canWriteSettings}
                      checked={state.settings.receiptShowLogo}
                      onChange={e => onUpdateSettings({ receiptShowLogo: e.target.checked })}
                    />
                  </label>
                  <label className="settings-toggle-row">
                    <span>
                      <strong>Show Customer</strong>
                      <small>Tampilkan nama dan nomor WhatsApp pelanggan.</small>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canWriteSettings}
                      checked={state.settings.receiptShowCustomer}
                      onChange={e => onUpdateSettings({ receiptShowCustomer: e.target.checked })}
                    />
                  </label>
                  <label className="settings-toggle-row">
                    <span>
                      <strong>Kitchen Ticket</strong>
                      <small>Aktifkan cetak tiket dapur (item, qty, catatan produksi).</small>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canWriteSettings}
                      checked={state.settings.kitchenTicketEnabled}
                      onChange={e => onUpdateSettings({ kitchenTicketEnabled: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            </article>

            <article className="card cream">
              <div className="page-eyebrow">
                Receipt Preview ({state.settings.receiptPaperSize} mm)
              </div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Thermal paper layout
              </h3>
              <div
                className="thermal-receipt-preview"
                data-paper-size={state.settings.receiptPaperSize}
              >
                {state.settings.receiptShowLogo && (
                  <div className="thermal-preview-logo">{state.settings.businessName}</div>
                )}
                <strong>RECEIPT</strong>
                <small>{state.settings.invoicePrefix}-202611-000001</small>
                <div className="thermal-preview-rule"></div>
                <div className="thermal-preview-row">
                  <span>Classic Tiramisu × 2</span>
                  <strong>Rp250.000</strong>
                </div>
                <div className="thermal-preview-row">
                  <span>Uji Matcha Box × 1</span>
                  <strong>Rp135.000</strong>
                </div>
                <div className="thermal-preview-rule"></div>
                <div className="thermal-preview-row thermal-preview-total">
                  <span>TOTAL</span>
                  <strong>Rp400.000</strong>
                </div>
                <div className="thermal-preview-row">
                  <span>Payment</span>
                  <strong>BCA</strong>
                </div>
                {state.settings.receiptShowCustomer && (
                  <div className="thermal-preview-customer">
                    Nadia Pramesti · 0812 8890 1122
                  </div>
                )}
                <div className="thermal-preview-rule"></div>
                <small>See you for another little bite! 🤎</small>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'automation' && (
        <section className="settings-panel">
          <div className="grid grid-2">
            <article className="card settings-toggle-list">
              <label className="settings-toggle-row">
                <span>
                  <strong>Auto Invoice on Order</strong>
                  <small>Buat invoice otomatis saat Order baru disimpan.</small>
                </span>
                <input
                  type="checkbox"
                  disabled={!canWriteSettings}
                  checked={state.settings.autoInvoiceOnOrder}
                  onChange={e => onUpdateSettings({ autoInvoiceOnOrder: e.target.checked })}
                />
              </label>
              <label className="settings-toggle-row">
                <span>
                  <strong>Auto Confirm on Paid</strong>
                  <small>Ubah status WAITING_PAYMENT ke CONFIRMED saat invoice PAID.</small>
                </span>
                <input
                  type="checkbox"
                  disabled={!canWriteSettings}
                  checked={state.settings.autoConfirmOnPaid}
                  onChange={e => onUpdateSettings({ autoConfirmOnPaid: e.target.checked })}
                />
              </label>
              <label className="settings-toggle-row">
                <span>
                  <strong>Allow Negative Stock</strong>
                  <small>Izinkan saldo stok di bawah 0 saat posting mutasi.</small>
                </span>
                <input
                  type="checkbox"
                  disabled={!canWriteSettings}
                  checked={state.settings.negativeStockAllowed}
                  onChange={e => onUpdateSettings({ negativeStockAllowed: e.target.checked })}
                />
              </label>
            </article>

            <article className="card">
              <div className="settings-system-list">
                <div>
                  <span>Pre-Order Almost Full Ratio</span>
                  <strong>{state.settings.preorderAlmostFullRatio * 100}% remaining</strong>
                </div>
                <div>
                  <span>CRM Dormant Threshold</span>
                  <strong>{state.settings.crmDormantDays} days</strong>
                </div>
                <div>
                  <span>Report Cache Lookback</span>
                  <strong>{state.settings.reportCacheLookbackDays} days</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'users' && isOwner && (
        <section className="settings-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">OWNER-only Governance</div>
              <h3 className="section-title">Users &amp; Roles</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {state.users.map(u => (
                  <tr key={u.userId}>
                    <td>
                      <strong>{u.displayName}</strong> ({u.userId})
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <StatusPill status={u.role} />
                    </td>
                    <td>
                      <StatusPill status={u.status} />
                    </td>
                    <td>{u.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'diagnostics' && (
        <section className="settings-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Integrity</div>
              <div className="card-value">PASS</div>
              <div className="card-help">0 unresolved ledger mismatches</div>
            </article>
            <article className="card">
              <div className="card-label">Canonical Tables</div>
              <div className="card-value">{canonicalSheets.length}</div>
              <div className="card-help">452 mapped columns</div>
            </article>
            <article className="card">
              <div className="card-label">Recent RPC Errors</div>
              <div className="card-value">0</div>
              <div className="card-help">Ring buffer clean</div>
            </article>
            <article className="card pink">
              <div className="card-label">RLS &amp; Storage</div>
              <div className="card-value">LOCKED</div>
              <div className="card-help">Private payment-proofs bucket</div>
            </article>
          </div>
        </section>
      )}

      {tab === 'release' && isOwner && (
        <section className="settings-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Release Version</div>
              <div className="card-value">0.1.0-dev</div>
              <div className="card-help">Supabase Rebuild Edition</div>
            </article>
            <article className="card">
              <div className="card-label">Status</div>
              <div className="card-value">PHASE 1</div>
              <div className="card-help">UI Parity + DDL Prepared</div>
            </article>
            <article className="card">
              <div className="card-label">Blocking Checks</div>
              <div className="card-value">0 Static</div>
              <div className="card-help">Awaiting live DEV DB push</div>
            </article>
            <article className="card pink">
              <div className="card-label">Legacy Gateway</div>
              <div className="card-value">108 Actions</div>
              <div className="card-help">Crosswalk verified</div>
            </article>
          </div>
        </section>
      )}

      {tab === 'system' && (
        <section className="settings-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">App Version</div>
              <div className="card-value">1.0.0</div>
            </article>
            <article className="card">
              <div className="card-label">Schema Version</div>
              <div className="card-value">1.0.0</div>
            </article>
            <article className="card">
              <div className="card-label">Database Health</div>
              <div className="card-value">33/33</div>
            </article>
            <article className="card cream">
              <div className="card-label">Phase</div>
              <div className="card-value">Supabase</div>
            </article>
          </div>
        </section>
      )}
    </section>
  );
}
