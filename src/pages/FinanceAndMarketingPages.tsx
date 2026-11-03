import { useState, type FormEvent } from 'react';
import { formatIDR, formatNumber, type PaymentEventStatus } from '../domain/calculators';
import { hasPermission } from '../domain/navigation';
import type {
  AppPreviewState,
  ExpenseRecord,
  MarketingCampaignRecord,
  MarketingContentRecord
} from '../state/previewData';
import { StatusPill } from '../components/Charts';

export function FinancePage({
  state,
  initialTab,
  onRecordPaymentOrRefund,
  onAddExpense,
  onOpenPublicInvoice,
  onOpenReceiptPrint,
  onToast
}: {
  state: AppPreviewState;
  initialTab?:
    | 'overview'
    | 'pnl'
    | 'expenses'
    | 'profitability'
    | 'invoices'
    | 'payments'
    | 'transactions';
  onRecordPaymentOrRefund: (input: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    referenceNo: string;
    status: PaymentEventStatus;
    proofFileName: string | null;
    notes: string;
  }) => void;
  onAddExpense: (expense: ExpenseRecord) => void;
  onOpenPublicInvoice: (invoiceId: string) => void;
  onOpenReceiptPrint: (invoiceId: string, mode: 'receipt' | 'kitchen') => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<
    'overview' | 'pnl' | 'expenses' | 'profitability' | 'invoices' | 'payments' | 'transactions'
  >(initialTab ?? 'overview');

  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'SUCCESS' | 'REFUND'>('SUCCESS');
  const [payAmount, setPayAmount] = useState('140000');
  const [payMethod, setPayMethod] = useState('QRIS');
  const [payRef, setPayRef] = useState('');
  const [payProofName, setPayProofName] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('INGREDIENTS');
  const [expVendor, setExpVendor] = useState('');
  const [expMethod, setExpMethod] = useState('BCA');
  const [expAmount, setExpAmount] = useState('150000');
  const [expCampaignId, setExpCampaignId] = useState<string>('');
  const [expNotes, setExpNotes] = useState('');

  const canSeePnl = hasPermission(state.role, 'PNL_READ');
  const canCreatePayment =
    hasPermission(state.role, 'PAYMENT_WRITE') || hasPermission(state.role, 'PAYMENT_CREATE');
  const canRefundAndViewProof = state.role === 'OWNER' || state.role === 'FINANCE';
  const canCreateExpense =
    hasPermission(state.role, 'EXPENSE_WRITE') ||
    hasPermission(state.role, 'EXPENSE_CREATE') ||
    hasPermission(state.role, 'EXPENSE_CREATE_MARKETING');

  const nonCancelledInvoices = state.invoices.filter(i => i.status !== 'CANCELLED');
  const totalInvoiced = nonCancelledInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = nonCancelledInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = nonCancelledInvoices.reduce((s, i) => s + i.remainingAmount, 0);
  const overdueCount = nonCancelledInvoices.filter(i => i.status === 'OVERDUE').length;

  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const productSales = completedOrders.reduce(
    (s, o) => s + (o.subtotal - o.discount),
    0
  );
  const deliveryRevenue = completedOrders.reduce((s, o) => s + o.deliveryFee, 0);
  const operatingRevenue = productSales + deliveryRevenue;
  const totalCogs = completedOrders.reduce(
    (s, o) => s + o.items.reduce((acc, it) => acc + it.unitCogsSnapshot * it.quantity, 0),
    0
  );
  const grossProfit = operatingRevenue - totalCogs;
  const grossMarginPct =
    operatingRevenue > 0 ? Math.round((grossProfit / operatingRevenue) * 100) : 0;

  const postedExpenses = state.expenses.filter(e => e.status === 'POSTED');
  const totalExpenses = postedExpenses.reduce((s, e) => s + e.amount, 0);
  const operatingProfit = grossProfit - totalExpenses;
  const operatingMarginPct =
    operatingRevenue > 0 ? Math.round((operatingProfit / operatingRevenue) * 100) : 0;

  const cashIn = state.transactions
    .filter(t => t.paymentMethod !== 'NON_CASH')
    .reduce((s, t) => s + t.amountIn, 0);
  const cashOut = state.transactions
    .filter(t => t.paymentMethod !== 'NON_CASH')
    .reduce((s, t) => s + t.amountOut, 0);
  const netCash = cashIn - cashOut;

  const selectedInvoice = state.invoices.find(i => i.invoiceId === paymentModalInvoiceId);

  function submitPaymentOrRefund(e: FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amt = Math.round(Number(payAmount) || 0);
    if (amt <= 0) {
      onToast('Nominal tidak valid', 'Masukkan jumlah Rupiah positif.', 'error');
      return;
    }
    const cleanRef = payRef.trim() || `${payMethod}-${Date.now().toString().slice(-6)}`;
    onRecordPaymentOrRefund({
      invoiceId: selectedInvoice.invoiceId,
      amount: amt,
      paymentMethod: payMethod,
      referenceNo: cleanRef,
      status: paymentMode,
      proofFileName: payProofName.trim() || null,
      notes: payNotes.trim()
    });
    setPaymentModalInvoiceId(null);
    setPayRef('');
    setPayProofName('');
    setPayNotes('');
  }

  function submitExpense(e: FormEvent) {
    e.preventDefault();
    if (!expVendor.trim()) return;
    const amt = Math.round(Number(expAmount) || 0);
    if (amt <= 0) return;
    onAddExpense({
      expenseId: `EXP-202611-00000${state.expenses.length + 1}`,
      expenseDate: '2026-11-04',
      category: expCategory,
      vendor: expVendor.trim(),
      paymentMethod: expMethod,
      amount: amt,
      status: 'POSTED',
      marketingCampaignId: expCampaignId || null,
      notes: expNotes.trim()
    });
    setExpVendor('');
    setExpNotes('');
    setShowExpenseModal(false);
    onToast('Pengeluaran tercatat', `Expense ${formatIDR(amt)} ditambahkan ke ledger.`, 'success');
  }

  return (
    <section className="page finance-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">payments</span>
        </div>
        <div className="module-copy">
          <h2>Finance</h2>
          <p>
            Receivables, payments, expenses, managerial P&amp;L, cash movement, and profitability
            connected to completed Orders and COGS snapshots.
          </p>
        </div>
      </div>

      <div className="finance-toolbar">
        <div className="product-tabs" role="tablist" aria-label="Finance tabs">
          {(
            [
              ['overview', 'Overview'],
              ['pnl', 'P&L'],
              ['expenses', 'Expenses'],
              ['profitability', 'Profitability'],
              ['invoices', 'Invoices'],
              ['payments', 'Payments'],
              ['transactions', 'Transactions']
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
              onToast('Finance disegarkan', 'Saldo invoice dan P&L dihitung dari ledger.', 'info')
            }
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
          {canCreateExpense && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowExpenseModal(true)}
            >
              <span className="material-symbols-outlined">receipt</span> Expense
            </button>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <section className="finance-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Invoice Value</div>
              <div className="card-value">{formatIDR(totalInvoiced)}</div>
              <div className="card-help">Non-cancelled invoices</div>
            </article>
            <article className="card">
              <div className="card-label">Paid</div>
              <div className="card-value">{formatIDR(totalPaid)}</div>
              <div className="card-help">Net paid after refunds</div>
            </article>
            <article className="card">
              <div className="card-label">Outstanding</div>
              <div className="card-value">{formatIDR(totalOutstanding)}</div>
              <div className="card-help">Remaining receivable</div>
            </article>
            <article className="card pink">
              <div className="card-label">Overdue</div>
              <div className="card-value">{overdueCount}</div>
              <div className="card-help">Invoices past due</div>
            </article>
          </div>

          {canSeePnl && (
            <div className="grid grid-4 finance-profit-kpis">
              <article className="card">
                <div className="card-label">Operating Revenue</div>
                <div className="card-value">{formatIDR(operatingRevenue)}</div>
                <div className="card-help">Completed orders · tax excluded</div>
              </article>
              <article className="card">
                <div className="card-label">COGS</div>
                <div className="card-value">{formatIDR(totalCogs)}</div>
                <div className="card-help">Snapshot + fallback estimate</div>
              </article>
              <article className="card">
                <div className="card-label">Gross Profit</div>
                <div className="card-value">{formatIDR(grossProfit)}</div>
                <div className="card-help">{grossMarginPct}% margin</div>
              </article>
              <article className="card pink">
                <div className="card-label">Operating Profit</div>
                <div className="card-value">{formatIDR(operatingProfit)}</div>
                <div className="card-help">{operatingMarginPct}% margin</div>
              </article>
            </div>
          )}

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Payment workflow</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                DP and partial payment are native
              </h3>
              <p className="page-subtitle">
                Each payment is stored as its own immutable payment event. Invoice and Order
                balances are derived from those events instead of manually editing a Paid amount
                cell.
              </p>
            </article>
            <article className="card">
              <div className="page-eyebrow">WhatsApp MVP</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Deep-link, not auto-send
              </h3>
              <p className="page-subtitle">
                The system prepares a customer-specific wa.me link containing invoice number,
                amount, due time, and public invoice link. You still press Send manually in
                WhatsApp.
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'pnl' && (
        <section className="finance-panel">
          {!canSeePnl ? (
            <article className="card">
              <div className="page-eyebrow">Role Restricted</div>
              <h3 className="section-title">P&amp;L hanya untuk OWNER &amp; FINANCE</h3>
              <p className="page-subtitle">
                Sesuai matriks otorisasi, detail laba-rugi manajerial dan rincian margin dibatasi
                untuk role OWNER dan FINANCE.
              </p>
            </article>
          ) : (
            <>
              <article className="card">
                <div className="finance-period-bar">
                  <div>
                    <div className="page-eyebrow">Managerial P&amp;L</div>
                    <h3 className="section-title">Profit &amp; Loss</h3>
                    <p className="section-copy">
                      Revenue is recognized on COMPLETED Orders using fulfillment date. Tax
                      collected is shown separately and excluded from operating revenue.
                    </p>
                  </div>
                </div>

                <div className="finance-pnl-grid">
                  <div className="finance-pnl-lines">
                    <div>
                      <span>Product Sales</span>
                      <strong>{formatIDR(productSales)}</strong>
                    </div>
                    <div>
                      <span>Delivery Revenue</span>
                      <strong>{formatIDR(deliveryRevenue)}</strong>
                    </div>
                    <div className="subtotal">
                      <span>Operating Revenue</span>
                      <strong>{formatIDR(operatingRevenue)}</strong>
                    </div>
                    <div>
                      <span>COGS</span>
                      <strong>{formatIDR(totalCogs)}</strong>
                    </div>
                    <div className="subtotal">
                      <span>Gross Profit</span>
                      <strong>{formatIDR(grossProfit)}</strong>
                    </div>
                    <div>
                      <span>Operating Expenses</span>
                      <strong>{formatIDR(totalExpenses)}</strong>
                    </div>
                    <div className="grand">
                      <span>Operating Profit</span>
                      <strong>{formatIDR(operatingProfit)}</strong>
                    </div>
                  </div>

                  <div className="finance-pnl-side">
                    <div>
                      <span>Completed Orders</span>
                      <strong>{completedOrders.length}</strong>
                    </div>
                    <div>
                      <span>Gross Margin</span>
                      <strong>{grossMarginPct}%</strong>
                    </div>
                    <div>
                      <span>Operating Margin</span>
                      <strong>{operatingMarginPct}%</strong>
                    </div>
                    <div>
                      <span>Tax Collected</span>
                      <strong>Rp0</strong>
                    </div>
                    <div>
                      <span>Net Cash Movement</span>
                      <strong>{formatIDR(netCash)}</strong>
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid grid-2">
                <article className="card">
                  <div className="page-eyebrow">Expense Mix</div>
                  <h3 className="section-title" style={{ marginTop: 6 }}>
                    Expenses by Category
                  </h3>
                  <div className="system-diagnostic-list">
                    {postedExpenses.map(e => (
                      <div key={e.expenseId} className="experience-list-row">
                        <div>
                          <strong>{e.category}</strong>
                          <span>
                            {e.vendor} · {e.notes}
                          </span>
                        </div>
                        <strong>{formatIDR(e.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="card cream">
                  <div className="page-eyebrow">Cash vs Profit</div>
                  <h3 className="section-title" style={{ marginTop: 6 }}>
                    Different questions
                  </h3>
                  <p className="page-subtitle">
                    P&amp;L uses completed-order revenue and non-cash COGS. Cash movement uses
                    actual transaction amount-in/out and excludes COGS transactions.
                  </p>
                </article>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'expenses' && (
        <section className="finance-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Operating Expenses</div>
              <h3 className="section-title">Expenses</h3>
              <p className="section-copy">
                Every expense creates an EXPENSE row and matching cash-out Transaction.
              </p>
            </div>
            {canCreateExpense && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowExpenseModal(true)}
              >
                <span className="material-symbols-outlined">add</span> Expense
              </button>
            )}
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.expenses.map(e => (
                  <tr key={e.expenseId}>
                    <td>
                      <strong>{e.expenseId}</strong>
                      <div>
                        <small>{e.notes}</small>
                      </div>
                    </td>
                    <td>{e.expenseDate}</td>
                    <td>{e.category}</td>
                    <td>{e.vendor}</td>
                    <td>{e.paymentMethod}</td>
                    <td className="num">{formatIDR(e.amount)}</td>
                    <td>
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'profitability' && (
        <section className="finance-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Contribution View</div>
              <h3 className="section-title">Product &amp; Channel Profitability</h3>
            </div>
          </div>

          <div className="grid grid-2 profitability-grid">
            <article className="card">
              <div className="page-eyebrow">Products</div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Qty</th>
                      <th className="num">Revenue</th>
                      <th className="num">COGS</th>
                      <th className="num">Gross Profit</th>
                      <th className="num">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.products.map(p => {
                      const items = completedOrders
                        .flatMap(o => o.items)
                        .filter(it => it.productId === p.productId);
                      const qty = items.reduce((s, it) => s + it.quantity, 0);
                      const rev = items.reduce((s, it) => s + it.lineTotal, 0);
                      const cogs = items.reduce(
                        (s, it) => s + it.unitCogsSnapshot * it.quantity,
                        0
                      );
                      const gp = rev - cogs;
                      const mPct = rev > 0 ? Math.round((gp / rev) * 100) : 0;
                      return (
                        <tr key={p.productId}>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td className="num">{qty}</td>
                          <td className="num">{formatIDR(rev)}</td>
                          <td className="num">{formatIDR(cogs)}</td>
                          <td className="num">{formatIDR(gp)}</td>
                          <td className="num">{mPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Sales Channels</div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th className="num">Orders</th>
                      <th className="num">Revenue</th>
                      <th className="num">COGS</th>
                      <th className="num">Gross Profit</th>
                      <th className="num">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['WHATSAPP', 'INSTAGRAM'].map(ch => {
                      const ords = completedOrders.filter(o => o.sourceChannel === ch);
                      const rev = ords.reduce((s, o) => s + (o.grandTotal - o.tax), 0);
                      const cogs = ords.reduce(
                        (s, o) =>
                          s + o.items.reduce((acc, it) => acc + it.unitCogsSnapshot * it.quantity, 0),
                        0
                      );
                      const gp = rev - cogs;
                      const mPct = rev > 0 ? Math.round((gp / rev) * 100) : 0;
                      return (
                        <tr key={ch}>
                          <td>
                            <strong>{ch}</strong>
                          </td>
                          <td className="num">{ords.length}</td>
                          <td className="num">{formatIDR(rev)}</td>
                          <td className="num">{formatIDR(cogs)}</td>
                          <td className="num">{formatIDR(gp)}</td>
                          <td className="num">{mPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'invoices' && (
        <section className="finance-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Receivables</div>
              <h3 className="section-title">Invoices</h3>
              <p className="section-copy">
                Balances are derived from payment events (SUCCESS − REFUND).
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table finance-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th className="num">Total</th>
                  <th className="num">Paid</th>
                  <th className="num">Remaining</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.invoices.map(inv => (
                  <tr key={inv.invoiceId}>
                    <td>
                      <strong>{inv.invoiceNumber}</strong>
                      <div>
                        <small>{inv.orderId}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{inv.customerName}</strong>
                      <div>
                        <small>{inv.customerWhatsapp}</small>
                      </div>
                    </td>
                    <td className="num">{formatIDR(inv.grandTotal)}</td>
                    <td className="num">{formatIDR(inv.paidAmount)}</td>
                    <td className="num">
                      <strong>{formatIDR(inv.remainingAmount)}</strong>
                    </td>
                    <td>{inv.dueAt.replace('T', ' ').slice(0, 16)}</td>
                    <td>
                      <StatusPill status={inv.status} />
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() => onOpenPublicInvoice(inv.invoiceId)}
                        >
                          WA / Public
                        </button>
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() => onOpenReceiptPrint(inv.invoiceId, 'receipt')}
                        >
                          Struk
                        </button>
                        {canCreatePayment && inv.remainingAmount > 0 && (
                          <button
                            type="button"
                            className="primary-btn compact-btn"
                            onClick={() => {
                              setPaymentModalInvoiceId(inv.invoiceId);
                              setPaymentMode('SUCCESS');
                              setPayAmount(String(inv.remainingAmount));
                            }}
                          >
                            Record Pay
                          </button>
                        )}
                        {canRefundAndViewProof && inv.paidAmount > 0 && (
                          <button
                            type="button"
                            className="secondary-btn compact-btn"
                            onClick={() => {
                              setPaymentModalInvoiceId(inv.invoiceId);
                              setPaymentMode('REFUND');
                              setPayAmount(String(inv.paidAmount));
                            }}
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'payments' && (
        <section className="finance-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Payment Events</div>
              <h3 className="section-title">Payments &amp; Refunds</h3>
              <p className="section-copy">
                SUCCESS increases paid balance. REFUND reduces the net paid balance. Private payment
                proofs require OWNER/FINANCE authorization.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference (Idempotent)</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Private Proof</th>
                </tr>
              </thead>
              <tbody>
                {state.payments.map(p => (
                  <tr key={p.paymentId}>
                    <td>
                      <strong>{p.paymentId}</strong>
                      {p.notes && (
                        <div>
                          <small>{p.notes}</small>
                        </div>
                      )}
                    </td>
                    <td>{p.invoiceId}</td>
                    <td>{p.paymentAt.replace('T', ' ').slice(0, 16)}</td>
                    <td>{p.paymentMethod}</td>
                    <td>
                      <code>{p.referenceNo}</code>
                    </td>
                    <td className="num">
                      <strong>{formatIDR(p.amount)}</strong>
                    </td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                    <td>
                      {!p.proofFileName ? (
                        <small>Tanpa file</small>
                      ) : canRefundAndViewProof ? (
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() =>
                            onToast(
                              'Signed URL Private Bucket',
                              `Membuka objek privat payment-proofs/${p.proofFileName} (${p.proofMime ?? 'image/jpeg'})`,
                              'info'
                            )
                          }
                        >
                          Lihat Bukti
                        </button>
                      ) : (
                        <small>Terbatas (OWNER/FINANCE)</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'transactions' && (
        <section className="finance-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Finance Ledger</div>
              <h3 className="section-title">Transactions</h3>
              <p className="section-copy">
                Payments, refunds, expenses, and non-cash COGS snapshots share one managerial
                transaction ledger.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Method</th>
                  <th className="num">In</th>
                  <th className="num">Out</th>
                </tr>
              </thead>
              <tbody>
                {state.transactions.map(t => (
                  <tr key={t.transactionId}>
                    <td>
                      <strong>{t.transactionId}</strong>
                    </td>
                    <td>{t.transactionDate}</td>
                    <td>
                      <StatusPill status={t.type} />
                    </td>
                    <td>{t.referenceId}</td>
                    <td>{t.paymentMethod}</td>
                    <td className="num">{t.amountIn > 0 ? formatIDR(t.amountIn) : '—'}</td>
                    <td className="num">{t.amountOut > 0 ? formatIDR(t.amountOut) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setPaymentModalInvoiceId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">
                  {paymentMode === 'SUCCESS' ? 'Record Payment' : 'Record Refund'}
                </div>
                <h3 className="section-title">
                  {selectedInvoice.invoiceNumber} · {selectedInvoice.customerName}
                </h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPaymentModalInvoiceId(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="section-copy" style={{ marginBottom: 14 }}>
              Grand Total: <strong>{formatIDR(selectedInvoice.grandTotal)}</strong> · Paid:{' '}
              <strong>{formatIDR(selectedInvoice.paidAmount)}</strong> · Remaining:{' '}
              <strong>{formatIDR(selectedInvoice.remainingAmount)}</strong>
            </p>
            <form className="form-grid" onSubmit={submitPaymentOrRefund}>
              <label className="form-field">
                <span>Jenis Transaksi</span>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as 'SUCCESS' | 'REFUND')}
                >
                  <option value="SUCCESS">SUCCESS (Pembayaran Masuk)</option>
                  {canRefundAndViewProof && (
                    <option value="REFUND">REFUND (Pengembalian Dana)</option>
                  )}
                </select>
              </label>
              <label className="form-field">
                <span>Metode Pembayaran</span>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {state.settings.paymentMethods.map(pm => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Nominal (IDR)</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Reference No (Idempotency Key)</span>
                <input
                  required
                  placeholder="Misal: QRIS-20261104-089"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                />
              </label>
              {paymentMode === 'SUCCESS' && (
                <label className="form-field span-2">
                  <span>Nama File Bukti Bayar Privat (JPG/PNG/WebP/PDF ≤ 8 MiB)</span>
                  <input
                    placeholder="2026-11-04_pelanggan_PAY.jpg"
                    value={payProofName}
                    onChange={e => setPayProofName(e.target.value)}
                  />
                </label>
              )}
              <label className="form-field span-2">
                <span>Catatan</span>
                <input
                  placeholder="DP / Pelunasan / Alasan refund"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPaymentModalInvoiceId(null)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  {paymentMode === 'SUCCESS' ? 'Simpan Pembayaran' : 'Proses Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Operating Expense</div>
                <h3 className="section-title">Catat Pengeluaran Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowExpenseModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={submitExpense}>
              <label className="form-field">
                <span>Kategori</span>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                  {state.settings.expenseCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Metode Pembayaran</span>
                <select value={expMethod} onChange={e => setExpMethod(e.target.value)}>
                  {state.settings.paymentMethods.map(pm => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Vendor / Penerima</span>
                <input
                  required
                  value={expVendor}
                  onChange={e => setExpVendor(e.target.value)}
                  placeholder="Misal: Meta Ads / Toko Bahan Kue"
                />
              </label>
              <label className="form-field">
                <span>Nominal (IDR)</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Link ke Marketing Campaign (Opsional)</span>
                <select value={expCampaignId} onChange={e => setExpCampaignId(e.target.value)}>
                  <option value="">— Tidak terkait campaign —</option>
                  {state.marketingCampaigns.map(c => (
                    <option key={c.campaignId} value={c.campaignId}>
                      {c.name} ({c.campaignId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field span-2">
                <span>Catatan</span>
                <input value={expNotes} onChange={e => setExpNotes(e.target.value)} />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowExpenseModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export function MarketingPage({
  state,
  onAssignAttribution,
  onAddCampaign,
  onAddContent,
  onToast
}: {
  state: AppPreviewState;
  onAssignAttribution: (orderId: string, campaignId: string | null) => void;
  onAddCampaign: (campaign: MarketingCampaignRecord) => void;
  onAddContent: (content: MarketingContentRecord) => void;
  onToast: (title: string, message: string, type?: 'info' | 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'content' | 'attribution' | 'spend'>(
    'overview'
  );
  const [showCampModal, setShowCampModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campBudget, setCampBudget] = useState('600000');

  const [showContentModal, setShowContentModal] = useState(false);
  const [cntTitle, setCntTitle] = useState('');
  const [cntPlatform, setCntPlatform] = useState<'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP'>('INSTAGRAM');

  const canWriteMarketing = hasPermission(state.role, 'MARKETING_WRITE');

  const marketingExpenses = state.expenses.filter(
    e => e.status === 'POSTED' && (e.marketingCampaignId || ['MARKETING', 'ADS'].includes(e.category))
  );
  const totalSpend = marketingExpenses.reduce((s, e) => s + e.amount, 0);

  const nonCancelledOrders = state.orders.filter(o => o.status !== 'CANCELLED');
  const attributedOrders = nonCancelledOrders.filter(o => Boolean(o.attributedCampaignId));
  const unattributedOrders = nonCancelledOrders.filter(o => !o.attributedCampaignId);

  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const totalCompletedRevenue = completedOrders.reduce((s, o) => s + (o.grandTotal - o.tax), 0);
  const attributedRevenue = completedOrders
    .filter(o => o.attributedCampaignId)
    .reduce((s, o) => s + (o.grandTotal - o.tax), 0);

  const roas = totalSpend > 0 ? `${(attributedRevenue / totalSpend).toFixed(2)}×` : '—';
  const orderCoverage =
    nonCancelledOrders.length > 0
      ? Math.round((attributedOrders.length / nonCancelledOrders.length) * 100)
      : 0;
  const revCoverage =
    totalCompletedRevenue > 0
      ? Math.round((attributedRevenue / totalCompletedRevenue) * 100)
      : 0;

  function submitCampaign(e: FormEvent) {
    e.preventDefault();
    if (!campName.trim()) return;
    onAddCampaign({
      campaignId: `MKT-202611-00000${state.marketingCampaigns.length + 1}`,
      name: campName.trim(),
      periodStart: '2026-11-04',
      periodEnd: '2026-11-30',
      budget: Number(campBudget) || 500000,
      spend: 0,
      orders: 0,
      revenue: 0,
      newCustomers: 0,
      status: 'ACTIVE'
    });
    setCampName('');
    setShowCampModal(false);
    onToast('Marketing Campaign dibuat', `${campName} siap digunakan untuk atribusi.`, 'success');
  }

  function submitContent(e: FormEvent) {
    e.preventDefault();
    if (!cntTitle.trim()) return;
    const firstCamp = state.marketingCampaigns[0];
    onAddContent({
      contentId: `CNT-00000${state.marketingContents.length + 1}`,
      campaignId: firstCamp?.campaignId ?? 'MKT-202611-000001',
      campaignName: firstCamp?.name ?? 'November Campaign',
      title: cntTitle.trim(),
      platform: cntPlatform,
      reach: 2500,
      views: 4100,
      engagement: 320,
      clicks: 75,
      orders: 0,
      revenue: 0
    });
    setCntTitle('');
    setShowContentModal(false);
    onToast('Konten ditambahkan', `${cntTitle} berhasil dicatat.`, 'success');
  }

  return (
    <section className="page marketing-page route-motion-enter">
      <div className="module-banner">
        <div className="module-icon">
          <span className="material-symbols-outlined">campaign</span>
        </div>
        <div className="module-copy">
          <h2>Marketing</h2>
          <p>
            Connect campaigns, content, marketing spend, manually assigned last-touch attribution,
            Orders, completed-order revenue, ROAS, and CAC-style acquisition metrics.
          </p>
        </div>
      </div>

      <div className="marketing-toolbar">
        <div className="product-tabs" role="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['campaigns', 'Campaigns'],
              ['content', 'Content'],
              ['attribution', 'Attribution'],
              ['spend', 'Spend']
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
              onToast('Marketing disegarkan', 'ROAS dan cakupan atribusi dihitung ulang.', 'info')
            }
          >
            <span className="material-symbols-outlined">refresh</span> Refresh
          </button>
          {canWriteMarketing && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setShowCampModal(true)}
            >
              <span className="material-symbols-outlined">add</span> Campaign
            </button>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <section className="marketing-panel">
          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">Marketing Spend</div>
              <div className="card-value">{formatIDR(totalSpend)}</div>
              <div className="card-help">Linked active Expenses</div>
            </article>
            <article className="card">
              <div className="card-label">Attributed Revenue</div>
              <div className="card-value">{formatIDR(attributedRevenue)}</div>
              <div className="card-help">Completed-order operating revenue</div>
            </article>
            <article className="card">
              <div className="card-label">ROAS</div>
              <div className="card-value">{roas}</div>
              <div className="card-help">Attributed revenue ÷ spend</div>
            </article>
            <article className="card pink">
              <div className="card-label">Attributed Orders</div>
              <div className="card-value">{attributedOrders.length}</div>
              <div className="card-help">Non-cancelled manually attributed Orders</div>
            </article>
          </div>

          <div className="grid grid-4">
            <article className="card">
              <div className="card-label">New Customers</div>
              <div className="card-value">2</div>
              <div className="card-help">Attributed first non-cancelled Orders</div>
            </article>
            <article className="card">
              <div className="card-label">CAC-style</div>
              <div className="card-value">{formatIDR(Math.round(totalSpend / 2))}</div>
              <div className="card-help">Spend ÷ attributed new customers</div>
            </article>
            <article className="card">
              <div className="card-label">Order Coverage</div>
              <div className="card-value">{orderCoverage}%</div>
              <div className="card-help">Orders with attribution mapping</div>
            </article>
            <article className="card">
              <div className="card-label">Revenue Coverage</div>
              <div className="card-value">{revCoverage}%</div>
              <div className="card-help">Completed operating revenue attributed</div>
            </article>
          </div>

          <div className="grid grid-2">
            <article className="card cream">
              <div className="page-eyebrow">Attribution Model</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Manual last-touch
              </h3>
              <p className="page-subtitle">
                Each Order can have one active Campaign and optional Content attribution. The latest
                attribution log wins.
              </p>
              <div className="marketing-flow">
                <span>Campaign</span>
                <span>→</span>
                <span>Content</span>
                <span>→</span>
                <span>Order</span>
                <span>→</span>
                <span>Completed Revenue</span>
              </div>
            </article>

            <article className="card">
              <div className="page-eyebrow">Source Channel</div>
              <h3 className="section-title" style={{ marginTop: 6 }}>
                Channel performance remains separate
              </h3>
              <p className="page-subtitle">
                Order <code>source_channel</code> shows where the order arrived. Campaign
                attribution explains which marketing activity receives last-touch credit.
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'campaigns' && (
        <section className="marketing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Campaign Performance</div>
              <h3 className="section-title">Campaigns</h3>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Period</th>
                  <th className="num">Budget</th>
                  <th className="num">Spend</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                  <th className="num">ROAS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.marketingCampaigns.map(c => (
                  <tr key={c.campaignId}>
                    <td>
                      <strong>{c.name}</strong> ({c.campaignId})
                    </td>
                    <td>
                      {c.periodStart} → {c.periodEnd}
                    </td>
                    <td className="num">{formatIDR(c.budget)}</td>
                    <td className="num">{formatIDR(c.spend)}</td>
                    <td className="num">{c.orders}</td>
                    <td className="num">{formatIDR(c.revenue)}</td>
                    <td className="num">
                      {c.spend > 0 ? `${(c.revenue / c.spend).toFixed(2)}×` : '—'}
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'content' && (
        <section className="marketing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Content Performance</div>
              <h3 className="section-title">Content</h3>
            </div>
            {canWriteMarketing && (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setShowContentModal(true)}
              >
                <span className="material-symbols-outlined">add</span> Content
              </button>
            )}
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th className="num">Reach</th>
                  <th className="num">Views</th>
                  <th className="num">Engagement</th>
                  <th className="num">Clicks</th>
                  <th className="num">Orders</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {state.marketingContents.map(cnt => (
                  <tr key={cnt.contentId}>
                    <td>
                      <strong>{cnt.title}</strong>
                    </td>
                    <td>{cnt.campaignName}</td>
                    <td>{cnt.platform}</td>
                    <td className="num">{formatNumber(cnt.reach)}</td>
                    <td className="num">{formatNumber(cnt.views)}</td>
                    <td className="num">{formatNumber(cnt.engagement)}</td>
                    <td className="num">{formatNumber(cnt.clicks)}</td>
                    <td className="num">{cnt.orders}</td>
                    <td className="num">{formatIDR(cnt.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'attribution' && (
        <section className="marketing-panel">
          <div className="grid grid-2">
            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Needs Attribution</div>
                  <h3 className="section-title">Unattributed Orders</h3>
                </div>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Channel</th>
                      <th className="num">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unattributedOrders.map(o => (
                      <tr key={o.orderId}>
                        <td>
                          <strong>{o.orderId}</strong>
                        </td>
                        <td>{o.customerName}</td>
                        <td>{o.sourceChannel}</td>
                        <td className="num">{formatIDR(o.grandTotal)}</td>
                        <td>
                          {canWriteMarketing && (
                            <button
                              type="button"
                              className="primary-btn compact-btn"
                              onClick={() =>
                                onAssignAttribution(
                                  o.orderId,
                                  state.marketingCampaigns[0]?.campaignId ?? 'MKT-202611-000001'
                                )
                              }
                            >
                              Attribute
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card">
              <div className="section-head">
                <div>
                  <div className="page-eyebrow">Attributed</div>
                  <h3 className="section-title">Active Mappings</h3>
                </div>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Campaign</th>
                      <th className="num">Revenue</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributedOrders.map(o => (
                      <tr key={o.orderId}>
                        <td>
                          <strong>{o.orderId}</strong>
                        </td>
                        <td>{o.attributedCampaignId}</td>
                        <td className="num">{formatIDR(o.grandTotal)}</td>
                        <td>
                          {canWriteMarketing && (
                            <button
                              type="button"
                              className="secondary-btn compact-btn"
                              onClick={() => onAssignAttribution(o.orderId, null)}
                            >
                              Clear
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === 'spend' && (
        <section className="marketing-panel">
          <div className="section-head">
            <div>
              <div className="page-eyebrow">Marketing Expenses</div>
              <h3 className="section-title">Spend</h3>
              <p className="section-copy">
                Marketing spend is recorded through Finance Expenses, then linked to a Campaign.
              </p>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Date</th>
                  <th>Campaign</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {marketingExpenses.map(e => (
                  <tr key={e.expenseId}>
                    <td>
                      <strong>{e.expenseId}</strong>
                    </td>
                    <td>{e.expenseDate}</td>
                    <td>{e.marketingCampaignId ?? '—'}</td>
                    <td>{e.category}</td>
                    <td>{e.vendor}</td>
                    <td>{e.paymentMethod}</td>
                    <td className="num">{formatIDR(e.amount)}</td>
                    <td>
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showCampModal && (
        <div className="modal-overlay" onClick={() => setShowCampModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Marketing Campaign</div>
                <h3 className="section-title">Tambah Campaign Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCampModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={submitCampaign}>
              <label className="form-field span-2">
                <span>Nama Campaign</span>
                <input
                  required
                  value={campName}
                  onChange={e => setCampName(e.target.value)}
                  placeholder="Misal: Payday Dessert Promo"
                />
              </label>
              <label className="form-field span-2">
                <span>Budget (IDR)</span>
                <input
                  type="number"
                  required
                  value={campBudget}
                  onChange={e => setCampBudget(e.target.value)}
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCampModal(false)}
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

      {showContentModal && (
        <div className="modal-overlay" onClick={() => setShowContentModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Marketing Content</div>
                <h3 className="section-title">Catat Konten Baru</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowContentModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={submitContent}>
              <label className="form-field span-2">
                <span>Judul Konten</span>
                <input
                  required
                  value={cntTitle}
                  onChange={e => setCntTitle(e.target.value)}
                  placeholder="Misal: Reels Plating Basque Cheesecake"
                />
              </label>
              <label className="form-field span-2">
                <span>Platform</span>
                <select
                  value={cntPlatform}
                  onChange={e =>
                    setCntPlatform(e.target.value as 'INSTAGRAM' | 'TIKTOK' | 'WHATSAPP')
                  }
                >
                  <option value="INSTAGRAM">INSTAGRAM</option>
                  <option value="TIKTOK">TIKTOK</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                </select>
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowContentModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Konten
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
