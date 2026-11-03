import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  buildWhatsAppDeepLink,
  calculateInvoiceBalance,
  formatIDR,
  renderWhatsAppTemplate,
  type PaymentEventStatus
} from './domain/calculators';
import {
  getDefaultRoute,
  getVisibleRoutes,
  hasPermission,
  type RouteId,
  type UserRole
} from './domain/navigation';
import { canTransitionOrder, type OrderStatus } from './domain/orderTransitions';
import { getSupabaseClient } from './lib/supabase/client';
import { signIn, signOut } from './services/auth';
import {
  createInitialPreviewState,
  type AppPreviewState,
  type InvoiceRecord,
  type OrderRecord
} from './state/previewData';
import { StatusPill } from './components/Charts';
import { BusinessPage, ExecutivePage } from './pages/ExecutiveAndBusinessPages';
import { CustomersPage, OrdersPage } from './pages/OrdersAndCustomersPages';
import { ProductionPage, ProductsPage } from './pages/ProductsAndProductionPages';
import { InventoryPage, PurchasingPage } from './pages/InventoryAndPurchasingPages';
import { FinancePage, MarketingPage } from './pages/FinanceAndMarketingPages';
import { ReportsPage, SettingsPage } from './pages/ReportsAndSettingsPages';

type AuthState =
  | { kind: 'unconfigured'; message: string }
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; user: User };

interface ToastItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

const BULK_NEXT_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  DRAFT: 'WAITING_PAYMENT',
  WAITING_PAYMENT: 'CONFIRMED',
  CONFIRMED: 'SCHEDULED',
  SCHEDULED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'READY',
  READY: 'COMPLETED',
  ON_DELIVERY: 'COMPLETED'
};

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });
  useEffect(() => {
    let client: ReturnType<typeof getSupabaseClient>;
    try {
      client = getSupabaseClient();
    } catch (error) {
      setState({ kind: 'unconfigured', message: (error as Error).message });
      return;
    }
    let active = true;
    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setState(session?.user ? { kind: 'signedIn', user: session.user } : { kind: 'signedOut' });
      }
    });
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setState(
            data.session?.user
              ? { kind: 'signedIn', user: data.session.user }
              : { kind: 'signedOut' }
          );
        }
      })
      .catch(() => {
        if (active) setState({ kind: 'signedOut' });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return state;
}

export default function App() {
  const auth = useAuthState();
  const [appState, setAppState] = useState<AppPreviewState>(() => createInitialPreviewState());
  const [currentRoute, setCurrentRoute] = useState<RouteId>('executive');
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Global modals (draft state preserved across tab switches per DESIGN.md Section 6)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [draftCustomerId, setDraftCustomerId] = useState('CUS-000001');
  const [draftChannel, setDraftChannel] = useState('WHATSAPP');
  const [draftCampaignId, setDraftCampaignId] = useState('');
  const [draftFulfillmentType, setDraftFulfillmentType] = useState('OWN_DELIVERY');
  const [draftFulfillmentDate, setDraftFulfillmentDate] = useState('2026-11-05');
  const [draftProductId, setDraftProductId] = useState('PRD-000001');
  const [draftQty, setDraftQty] = useState('2');
  const [draftDeliveryFee, setDraftDeliveryFee] = useState('20000');
  const [draftDiscount, setDraftDiscount] = useState('0');
  const [draftNotes, setDraftNotes] = useState('');

  const [publicInvoiceModalId, setPublicInvoiceModalId] = useState<string | null>(null);
  const [printModalState, setPrintModalState] = useState<{
    invoiceId: string;
    mode: 'receipt' | 'kitchen';
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const visibleRoutes = getVisibleRoutes(appState.role);
  const primaryRoutes = visibleRoutes.filter(r => r.primary);
  const moreRoutes = visibleRoutes.filter(r => !r.primary);

  function addToast(
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, title, message, type }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }

  function navigateTo(route: RouteId) {
    if (!visibleRoutes.some(r => r.id === route)) {
      addToast(
        'Akses Dibatasi',
        `Modul ${route} tidak tersedia untuk role ${appState.role}.`,
        'error'
      );
      return;
    }
    setCurrentRoute(route);
    setMoreOpen(false);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }

  function handleRoleChange(newRole: UserRole) {
    setAppState(prev => ({ ...prev, role: newRole }));
    const nextVisible = getVisibleRoutes(newRole);
    if (!nextVisible.some(r => r.id === currentRoute)) {
      setCurrentRoute(getDefaultRoute(newRole));
    }
    addToast('Role Diubah', `Menampilkan UI dengan hak akses ${newRole}.`, 'info');
  }

  function handleCreateOrderSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasPermission(appState.role, 'ORDER_WRITE')) {
      addToast('Akses ditolak', 'Role Anda tidak memiliki izin ORDER_WRITE.', 'error');
      return;
    }

    const customer = appState.customers.find(c => c.customerId === draftCustomerId);
    const product = appState.products.find(p => p.productId === draftProductId);
    if (!customer || !product) return;

    // Pre-order capacity check
    if (draftCampaignId) {
      const camp = appState.preorderCampaigns.find(c => c.campaignId === draftCampaignId);
      if (camp && camp.currentBooked >= camp.maxCapacity && appState.role !== 'OWNER') {
        addToast(
          'Kapasitas Pre-Order Penuh',
          `Campaign ${camp.name} sudah mencapai batas ${camp.maxCapacity}.`,
          'error'
        );
        return;
      }
    }

    const qty = Math.max(1, Math.round(Number(draftQty) || 1));
    const subtotal = product.sellingPrice * qty;
    const deliv = Math.max(0, Math.round(Number(draftDeliveryFee) || 0));
    const disc = Math.max(0, Math.round(Number(draftDiscount) || 0));
    const grandTotal = Math.max(0, subtotal + deliv - disc);

    const nextIdx = appState.orders.length + 1;
    const orderId = `ORD-202611-00000${nextIdx}`;
    const invoiceId = `INV-202611-00000${nextIdx}`;
    const invoiceNumber = `${appState.settings.invoicePrefix}-202611-00000${nextIdx}`;

    const newOrder: OrderRecord = {
      orderId,
      createdAt: '2026-11-04T10:30:00+07:00',
      customerId: customer.customerId,
      customerName: customer.name,
      customerWhatsapp: customer.whatsapp,
      sourceChannel: draftChannel,
      preorderCampaignId: draftCampaignId || null,
      fulfillmentType: draftFulfillmentType,
      fulfillmentDate: draftFulfillmentDate,
      subtotal,
      deliveryFee: deliv,
      discount: disc,
      tax: 0,
      grandTotal,
      paymentStatus: 'WAITING_PAYMENT',
      status: 'WAITING_PAYMENT',
      invoiceId,
      attributedCampaignId: null,
      attributedContentId: null,
      notes: draftNotes.trim(),
      items: [
        {
          orderItemId: `ORI-0000${nextIdx}1`,
          productId: product.productId,
          variantId: null,
          productTitle: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice: product.sellingPrice,
          unitCogsSnapshot: product.unitCogs,
          lineTotal: subtotal,
          productionNotes: draftNotes.trim()
        }
      ]
    };

    const newInvoice: InvoiceRecord = {
      invoiceId,
      invoiceNumber,
      orderId,
      customerId: customer.customerId,
      customerName: customer.name,
      customerWhatsapp: customer.whatsapp,
      issuedAt: '2026-11-04T10:30:00+07:00',
      dueAt: '2026-11-05T10:30:00+07:00',
      grandTotal,
      paidAmount: 0,
      remainingAmount: grandTotal,
      status: 'WAITING_PAYMENT',
      publicToken: `pub_tok_${nextIdx}99a1b`,
      lastPaymentMethod: '—'
    };

    setAppState(prev => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
      invoices: [newInvoice, ...prev.invoices],
      preorderCampaigns: prev.preorderCampaigns.map(c =>
        c.campaignId === draftCampaignId
          ? {
              ...c,
              currentBooked: c.currentBooked + 1,
              status: c.currentBooked + 1 >= c.maxCapacity ? 'FULL' : c.status
            }
          : c
      )
    }));

    setShowNewOrderModal(false);
    setDraftNotes('');
    navigateTo('orders');
    addToast(
      'Order & Invoice Dibuat',
      `${orderId} (${formatIDR(grandTotal)}) berhasil disimpan dengan harga snapshot.`,
      'success'
    );
  }

  function handleTransitionOrders(orderIds: string[], targetStatus: OrderStatus | 'NEXT') {
    setAppState(prev => ({
      ...prev,
      orders: prev.orders.map(order => {
        if (!orderIds.includes(order.orderId)) return order;
        const resolvedTarget: OrderStatus | undefined =
          targetStatus === 'NEXT'
            ? order.status === 'READY' && order.fulfillmentType !== 'PICKUP'
              ? 'ON_DELIVERY'
              : BULK_NEXT_MAP[order.status]
            : targetStatus;
        if (!resolvedTarget || !canTransitionOrder(order.status, resolvedTarget)) {
          return order;
        }
        return { ...order, status: resolvedTarget };
      })
    }));
    addToast(
      'Status Order Diperbarui',
      `${orderIds.length} order dipindahkan sesuai transisi resmi Hotfix 19.`,
      'success'
    );
  }

  function handleRecordPaymentOrRefund(input: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    referenceNo: string;
    status: PaymentEventStatus;
    proofFileName: string | null;
    notes: string;
  }) {
    // Check idempotency on reference_no
    const existing = appState.payments.find(
      p => p.referenceNo.toLowerCase() === input.referenceNo.toLowerCase()
    );
    if (existing) {
      if (
        existing.invoiceId === input.invoiceId &&
        existing.amount === input.amount &&
        existing.paymentMethod === input.paymentMethod &&
        existing.status === input.status
      ) {
        addToast(
          'Pembayaran sudah tercatat',
          `Idempotent retry terdeteksi untuk referensi ${input.referenceNo}.`,
          'info'
        );
        return;
      }
      addToast(
        '409 PAYMENT_REFERENCE_CONFLICT',
        `Nomor referensi ${input.referenceNo} sudah dipakai dengan detail berbeda.`,
        'error'
      );
      return;
    }

    const targetInv = appState.invoices.find(i => i.invoiceId === input.invoiceId);
    if (!targetInv) return;

    const existingInvPayments = appState.payments.filter(p => p.invoiceId === input.invoiceId);
    const currentCalc = calculateInvoiceBalance(targetInv.grandTotal, existingInvPayments);

    if (input.status === 'REFUND' && input.amount > currentCalc.netPaid) {
      addToast(
        'REFUND_EXCEEDS_PAID',
        `Nominal refund (${formatIDR(input.amount)}) melebihi dana masuk bersih (${formatIDR(currentCalc.netPaid)}).`,
        'error'
      );
      return;
    }

    const newPaymentId = `PAY-202611-00000${appState.payments.length + 1}`;
    const newPayRecord = {
      paymentId: newPaymentId,
      invoiceId: targetInv.invoiceId,
      orderId: targetInv.orderId,
      paymentAt: '2026-11-04T11:00:00+07:00',
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      referenceNo: input.referenceNo,
      status: input.status,
      proofFileName: input.proofFileName,
      proofMime: input.proofFileName?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
      notes: input.notes
    };

    const updatedPaymentsForInv = [...existingInvPayments, newPayRecord];
    const nextCalc = calculateInvoiceBalance(targetInv.grandTotal, updatedPaymentsForInv);

    setAppState(prev => ({
      ...prev,
      payments: [newPayRecord, ...prev.payments],
      invoices: prev.invoices.map(inv =>
        inv.invoiceId === targetInv.invoiceId
          ? {
              ...inv,
              paidAmount: nextCalc.netPaid,
              remainingAmount: nextCalc.remaining,
              status: nextCalc.status,
              lastPaymentMethod:
                input.status === 'SUCCESS' ? input.paymentMethod : inv.lastPaymentMethod
            }
          : inv
      ),
      orders: prev.orders.map(ord => {
        if (ord.orderId !== targetInv.orderId) return ord;
        const autoConfirm =
          prev.settings.autoConfirmOnPaid &&
          nextCalc.status === 'PAID' &&
          ord.status === 'WAITING_PAYMENT';
        return {
          ...ord,
          paymentStatus: nextCalc.status,
          status: autoConfirm ? 'CONFIRMED' : ord.status
        };
      }),
      transactions: [
        {
          transactionId: `TRX-202611-00000${prev.transactions.length + 1}`,
          transactionDate: '2026-11-04',
          type: input.status === 'SUCCESS' ? 'PAYMENT_IN' : 'REFUND_OUT',
          referenceId: newPaymentId,
          paymentMethod: input.paymentMethod,
          amountIn: input.status === 'SUCCESS' ? input.amount : 0,
          amountOut: input.status === 'REFUND' ? input.amount : 0
        },
        ...prev.transactions
      ]
    }));

    addToast(
      input.status === 'SUCCESS' ? 'Pembayaran berhasil dicatat' : 'Refund berhasil dicatat',
      `Saldo invoice ${targetInv.invoiceNumber} kini ${nextCalc.status} (Sisa ${formatIDR(nextCalc.remaining)}).`,
      'success'
    );
  }

  function handleAdjustStock(itemId: string, countedStockBase: number, reason: string) {
    const mat = appState.materials.find(m => m.itemId === itemId);
    if (!mat) return;
    const delta = countedStockBase - mat.currentStockBase;
    if (delta === 0) {
      addToast('Stok sama', 'Tidak ada selisih antara stok sistem dan hitung fisik.', 'info');
      return;
    }

    const movId = `MOV-202611-00000${appState.inventoryMovements.length + 1}`;
    setAppState(prev => ({
      ...prev,
      materials: prev.materials.map(m =>
        m.itemId === itemId ? { ...m, currentStockBase: countedStockBase } : m
      ),
      inventoryMovements: [
        {
          movementId: movId,
          movementAt: '2026-11-04T11:15:00+07:00',
          itemId: mat.itemId,
          materialName: mat.name,
          itemType: mat.itemType,
          movementType: 'ADJUSTMENT',
          qtyInBase: delta > 0 ? delta : 0,
          qtyOutBase: delta < 0 ? Math.abs(delta) : 0,
          balanceAfterBase: countedStockBase,
          baseUnit: mat.baseUnit,
          referenceId: 'OPNAME-20261104',
          notes: reason
        },
        ...prev.inventoryMovements
      ]
    }));
    addToast(
      'Mutasi Stok Tercatat',
      `${mat.name} disesuaikan menjadi ${countedStockBase} ${mat.baseUnit}.`,
      'success'
    );
  }

  function handlePostProductionUsage(planId: string) {
    const plan = appState.productionPlans.find(p => p.planId === planId);
    if (!plan || plan.usagePosted) return;

    const hasShortage = plan.requirements.some(r => r.status === 'SHORTAGE');
    if (hasShortage && !appState.settings.negativeStockAllowed) {
      addToast(
        'NEGATIVE_STOCK_BLOCKED',
        `Plan ${planId} memiliki material SHORTAGE dan NEGATIVE_STOCK_ALLOWED=false. Lakukan Receive PO terlebih dahulu.`,
        'error'
      );
      return;
    }

    setAppState(prev => ({
      ...prev,
      productionPlans: prev.productionPlans.map(p =>
        p.planId === planId ? { ...p, usagePosted: true, status: 'COMPLETED' } : p
      ),
      materials: prev.materials.map(m => {
        const req = plan.requirements.find(r => r.itemId === m.itemId);
        if (!req) return m;
        return { ...m, currentStockBase: m.currentStockBase - req.requiredQtyBase };
      })
    }));

    addToast(
      'Production Usage Diposting Sekali',
      `Kebutuhan material ${planId} telah dipotong dari Inventory Ledger.`,
      'success'
    );
  }

  function handleReceivePurchase(purchaseId: string) {
    const po = appState.purchases.find(p => p.purchaseId === purchaseId);
    if (!po || po.status === 'RECEIVED') return;

    setAppState(prev => ({
      ...prev,
      purchases: prev.purchases.map(p =>
        p.purchaseId === purchaseId
          ? {
              ...p,
              status: 'RECEIVED',
              receivingStatus: 'RECEIVED',
              items: p.items.map(it => ({ ...it, receivedQtyBase: it.orderedQtyBase }))
            }
          : p
      ),
      materials: prev.materials.map(m => {
        const line = po.items.find(it => it.itemId === m.itemId);
        if (!line) return m;
        return { ...m, currentStockBase: m.currentStockBase + line.orderedQtyBase };
      }),
      productionPlans: prev.productionPlans.map(plan => ({
        ...plan,
        requirements: plan.requirements.map(req => {
          const line = po.items.find(it => it.itemId === req.itemId);
          if (!line) return req;
          const nextAvail = req.availableQtyBase + line.orderedQtyBase;
          const nextShortage = Math.max(0, req.requiredQtyBase - nextAvail);
          return {
            ...req,
            availableQtyBase: nextAvail,
            shortageQtyBase: nextShortage,
            status: nextShortage === 0 ? 'SUFFICIENT' : 'SHORTAGE'
          };
        })
      }))
    }));

    addToast(
      'Penerimaan Barang Selesai',
      `Stok dari ${purchaseId} telah masuk ke Inventory Ledger dan memperbarui ketersediaan produksi.`,
      'success'
    );
  }

  async function handleSupabaseLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        setLoginError(`Login gagal: ${error.message}`);
      } else {
        setShowAuthModal(false);
        addToast('Login Supabase Berhasil', `Terhubung sebagai ${loginEmail}`, 'success');
      }
    } catch {
      setLoginError('Tidak dapat terhubung ke server DEV. Periksa konfigurasi .env.local.');
    } finally {
      setLoginBusy(false);
    }
  }

  const activeUserDisplay =
    appState.users.find(u => u.role === appState.role) ?? appState.users[0];

  const modalPublicInvoice = appState.invoices.find(
    i => i.invoiceId === publicInvoiceModalId
  );
  const modalPublicOrder = modalPublicInvoice
    ? appState.orders.find(o => o.orderId === modalPublicInvoice.orderId)
    : undefined;

  const modalPrintInvoice = printModalState
    ? appState.invoices.find(i => i.invoiceId === printModalState.invoiceId)
    : undefined;
  const modalPrintOrder = modalPrintInvoice
    ? appState.orders.find(o => o.orderId === modalPrintInvoice.orderId)
    : undefined;

  return (
    <div id="twb-app" className="app-shell has-dev-bar">
      {/* Top Developer & Role Preview Control Strip */}
      <div className="dev-mode-bar">
        <div>
          <strong>Twolittle.bites OS · Supabase Rebuild v0.1.0-dev</strong>
          <span> — Visual Parity 12 Halaman (Hotfix 19)</span>
        </div>
        <div className="dev-mode-controls">
          <label>
            <span>Simulasi Role UI: </span>
            <select
              className="dev-mode-select"
              value={appState.role}
              onChange={e => handleRoleChange(e.target.value as UserRole)}
              aria-label="Simulasi Role Pengguna"
            >
              <option value="OWNER">OWNER (Full Access)</option>
              <option value="ADMIN">ADMIN (Ops &amp; Catalog)</option>
              <option value="PRODUCTION">PRODUCTION (Kitchen &amp; Stock)</option>
              <option value="MARKETING">MARKETING (Growth &amp; CRM)</option>
              <option value="FINANCE">FINANCE (Invoices, Proof &amp; P&amp;L)</option>
            </select>
          </label>
          <button
            type="button"
            className="dev-mode-btn ghost"
            onClick={() => setShowAuthModal(true)}
          >
            {auth.kind === 'signedIn'
              ? `Supabase: ${auth.user.email ?? 'Aktif'}`
              : 'Koneksi Supabase DEV'}
          </button>
        </div>
      </div>

      {/* Hotfix 19 Foundation Strip */}
      <div id="foundation-strip" className="foundation-strip">
        <div className="foundation-left">
          <span id="foundation-dot" className="dot"></span>
          <strong>Data Foundation</strong>
          <span id="foundation-schema">33/33 tables valid</span>
          <span className="hide-mobile">•</span>
          <span id="foundation-version" className="hide-mobile">
            App 1.0.0 · Schema 1.0.0 ({appState.role})
          </span>
        </div>
      </div>

      {/* Hotfix 19 App Header */}
      <header className="app-header">
        <div className="header-inner">
          <div
            className="brand"
            aria-label="Twolittle.bites"
            style={{ cursor: 'pointer' }}
            onClick={() => navigateTo(getDefaultRoute(appState.role))}
          >
            <span className="brand-mark">tb</span>
            <span id="brand-name" className="brand-name">
              {appState.settings.businessName}
            </span>
          </div>

          <nav id="desktop-primary-nav" className="desktop-nav" aria-label="Primary navigation">
            {primaryRoutes.map(item => (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${currentRoute === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {moreRoutes.length > 0 && (
              <div className="more-wrap">
                <button
                  type="button"
                  className={`more-trigger ${moreRoutes.some(r => r.id === currentRoute) ? 'active' : ''}`}
                  onClick={() => setMoreOpen(prev => !prev)}
                >
                  <span>More</span>
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
                {moreOpen && (
                  <div className="more-menu">
                    {moreRoutes.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={`nav-link ${currentRoute === item.id ? 'active' : ''}`}
                        onClick={() => navigateTo(item.id)}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <button
            id="mobile-menu-btn"
            className="icon-btn mobile-menu-btn"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="header-actions">
            {hasPermission(appState.role, 'ORDER_WRITE') && (
              <button
                className="primary-btn header-new-order"
                type="button"
                onClick={() => setShowNewOrderModal(true)}
              >
                <span className="material-symbols-outlined">add</span>
                New Order
              </button>
            )}

            <div className="user-chip" onClick={() => setShowAuthModal(true)} style={{ cursor: 'pointer' }}>
              <div className="avatar">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="user-copy">
                <div id="header-user-name" className="user-name">
                  {activeUserDisplay.displayName}
                </div>
                <div id="header-user-role" className="user-role">
                  {appState.role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div
          id="mobile-drawer"
          className="mobile-drawer"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <aside
            className="mobile-panel"
            aria-label="Mobile navigation"
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-panel-head">
              <div>
                <div className="brand-name">{appState.settings.businessName}</div>
                <div className="brand-meta">Navigation ({appState.role})</div>
              </div>
              <button
                id="mobile-close-btn"
                className="icon-btn"
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav id="mobile-nav" className="mobile-nav">
              {visibleRoutes.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link ${currentRoute === item.id ? 'active' : ''}`}
                  onClick={() => navigateTo(item.id)}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Route Host */}
      <main className="app-main" onClick={() => moreOpen && setMoreOpen(false)}>
        <div id="app-route" className="route-host">
          {currentRoute === 'executive' && (
            <ExecutivePage
              state={appState}
              onNavigate={navigateTo}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onUpdatePeriod={(periodStart, periodEnd) =>
                setAppState(prev => ({ ...prev, periodStart, periodEnd }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'business' && (
            <BusinessPage
              state={appState}
              onAddTarget={target =>
                setAppState(prev => ({ ...prev, targets: [...prev.targets, target] }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'orders' && (
            <OrdersPage
              state={appState}
              onOpenNewOrder={() => setShowNewOrderModal(true)}
              onTransitionOrders={handleTransitionOrders}
              onAddCampaign={camp =>
                setAppState(prev => ({
                  ...prev,
                  preorderCampaigns: [camp, ...prev.preorderCampaigns]
                }))
              }
              onOpenPublicInvoice={invId => setPublicInvoiceModalId(invId)}
              onOpenReceiptPrint={(invoiceId, mode) => setPrintModalState({ invoiceId, mode })}
              onToast={addToast}
            />
          )}

          {currentRoute === 'customers' && (
            <CustomersPage
              state={appState}
              onAddCustomer={cust =>
                setAppState(prev => ({ ...prev, customers: [cust, ...prev.customers] }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'products' && (
            <ProductsPage
              state={appState}
              onAddProduct={prod =>
                setAppState(prev => ({ ...prev, products: [...prev.products, prod] }))
              }
              onAddMaterial={mat =>
                setAppState(prev => ({ ...prev, materials: [...prev.materials, mat] }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'production' && (
            <ProductionPage
              state={appState}
              onCreatePlan={plan =>
                setAppState(prev => ({
                  ...prev,
                  productionPlans: [plan, ...prev.productionPlans]
                }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'inventory' && (
            <InventoryPage
              state={appState}
              onAdjustStock={handleAdjustStock}
              onPostProductionUsage={handlePostProductionUsage}
              onToast={addToast}
            />
          )}

          {currentRoute === 'purchasing' && (
            <PurchasingPage
              state={appState}
              onReceivePurchase={handleReceivePurchase}
              onAddPurchase={po =>
                setAppState(prev => ({ ...prev, purchases: [po, ...prev.purchases] }))
              }
              onAddSupplier={sup =>
                setAppState(prev => ({ ...prev, suppliers: [...prev.suppliers, sup] }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'finance' && (
            <FinancePage
              state={appState}
              onRecordPaymentOrRefund={handleRecordPaymentOrRefund}
              onAddExpense={exp =>
                setAppState(prev => ({
                  ...prev,
                  expenses: [exp, ...prev.expenses],
                  transactions: [
                    {
                      transactionId: `TRX-202611-00000${prev.transactions.length + 1}`,
                      transactionDate: exp.expenseDate,
                      type: 'EXPENSE_OUT',
                      referenceId: exp.expenseId,
                      paymentMethod: exp.paymentMethod,
                      amountIn: 0,
                      amountOut: exp.amount
                    },
                    ...prev.transactions
                  ]
                }))
              }
              onOpenPublicInvoice={invId => setPublicInvoiceModalId(invId)}
              onOpenReceiptPrint={(invoiceId, mode) => setPrintModalState({ invoiceId, mode })}
              onToast={addToast}
            />
          )}

          {currentRoute === 'marketing' && (
            <MarketingPage
              state={appState}
              onAssignAttribution={(orderId, campaignId) => {
                setAppState(prev => ({
                  ...prev,
                  orders: prev.orders.map(o =>
                    o.orderId === orderId ? { ...o, attributedCampaignId: campaignId } : o
                  )
                }));
                addToast(
                  'Atribusi Diperbarui',
                  campaignId
                    ? `Order ${orderId} dihubungkan ke ${campaignId}.`
                    : `Atribusi ${orderId} dihapus.`,
                  'success'
                );
              }}
              onAddCampaign={camp =>
                setAppState(prev => ({
                  ...prev,
                  marketingCampaigns: [camp, ...prev.marketingCampaigns]
                }))
              }
              onAddContent={cnt =>
                setAppState(prev => ({
                  ...prev,
                  marketingContents: [cnt, ...prev.marketingContents]
                }))
              }
              onToast={addToast}
            />
          )}

          {currentRoute === 'reports' && <ReportsPage state={appState} onToast={addToast} />}

          {currentRoute === 'settings' && (
            <SettingsPage
              state={appState}
              onUpdateSettings={next =>
                setAppState(prev => ({
                  ...prev,
                  settings: { ...prev.settings, ...next }
                }))
              }
              onToast={addToast}
            />
          )}
        </div>
      </main>

      {/* Hotfix 19 Quick Actions Bottom Bar */}
      <div id="quick-bar" className="quick-bar">
        <div className="quick-actions">
          <button
            className="quick-action primary"
            type="button"
            onClick={() => setShowNewOrderModal(true)}
          >
            <span className="material-symbols-outlined">add</span>
            <span>Order</span>
          </button>
          <button
            className="quick-action secondary"
            type="button"
            onClick={() => navigateTo('finance')}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span>Invoice</span>
          </button>
          <button
            className="quick-action secondary"
            type="button"
            onClick={() => navigateTo('products')}
          >
            <span className="material-symbols-outlined">calculate</span>
            <span>Recipe</span>
          </button>
          <button
            className="quick-action secondary"
            type="button"
            onClick={() => navigateTo('purchasing')}
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>Purchase</span>
          </button>
          <button
            className="quick-action secondary"
            type="button"
            onClick={() => navigateTo('finance')}
          >
            <span className="material-symbols-outlined">receipt</span>
            <span>Expense</span>
          </button>
          <button
            className="quick-action icon-only"
            type="button"
            aria-label="WhatsApp queue"
            onClick={() =>
              setPublicInvoiceModalId(appState.invoices[0]?.invoiceId ?? 'INV-202611-000001')
            }
          >
            <span className="material-symbols-outlined">chat</span>
          </button>
        </div>
      </div>

      {/* Toast Notification Stack */}
      <div id="toast-stack" className="toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="material-symbols-outlined">
              {t.type === 'error' ? 'error' : t.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <div>
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Global New Order Modal (retains draft state when closed/reopened) */}
      {showNewOrderModal && (
        <div className="modal-overlay" onClick={() => setShowNewOrderModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Order &amp; Pre-Order Engine</div>
                <h3 className="section-title">Buat Order Baru (Harga Snapshot)</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowNewOrderModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="form-grid" onSubmit={handleCreateOrderSubmit}>
              <label className="form-field">
                <span>Pelanggan</span>
                <select
                  value={draftCustomerId}
                  onChange={e => setDraftCustomerId(e.target.value)}
                >
                  {appState.customers.map(c => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.name} ({c.whatsapp})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Source Channel</span>
                <select value={draftChannel} onChange={e => setDraftChannel(e.target.value)}>
                  {appState.settings.salesChannels.map(ch => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Pre-Order Campaign (Opsional)</span>
                <select
                  value={draftCampaignId}
                  onChange={e => setDraftCampaignId(e.target.value)}
                >
                  <option value="">— Regular Order —</option>
                  {appState.preorderCampaigns.map(camp => (
                    <option key={camp.campaignId} value={camp.campaignId}>
                      {camp.name} ({camp.currentBooked}/{camp.maxCapacity})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Fulfillment Type</span>
                <select
                  value={draftFulfillmentType}
                  onChange={e => setDraftFulfillmentType(e.target.value)}
                >
                  {appState.settings.fulfillmentTypes.map(ft => (
                    <option key={ft} value={ft}>
                      {ft}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Tanggal Kirim / Pickup</span>
                <input
                  type="date"
                  required
                  value={draftFulfillmentDate}
                  onChange={e => setDraftFulfillmentDate(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Produk</span>
                <select value={draftProductId} onChange={e => setDraftProductId(e.target.value)}>
                  {appState.products.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.name} ({formatIDR(p.sellingPrice)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Kuantitas</span>
                <input
                  type="number"
                  min={1}
                  required
                  value={draftQty}
                  onChange={e => setDraftQty(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Ongkos Kirim (IDR)</span>
                <input
                  type="number"
                  min={0}
                  value={draftDeliveryFee}
                  onChange={e => setDraftDeliveryFee(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Diskon (IDR)</span>
                <input
                  type="number"
                  min={0}
                  value={draftDiscount}
                  onChange={e => setDraftDiscount(e.target.value)}
                />
              </label>
              <label className="form-field span-2">
                <span>Catatan Produksi / Pengiriman</span>
                <input
                  value={draftNotes}
                  onChange={e => setDraftNotes(e.target.value)}
                  placeholder="Misal: Pita ucapan ulang tahun, kirim pagi"
                />
              </label>
              <div className="span-2 form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowNewOrderModal(false)}
                >
                  Simpan Draft &amp; Tutup
                </button>
                <button type="submit" className="primary-btn">
                  Simpan Order &amp; Buat Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Invoice & Manual WhatsApp Deep-Link Modal */}
      {modalPublicInvoice && modalPublicOrder && (
        <div className="modal-overlay" onClick={() => setPublicInvoiceModalId(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Public Invoice &amp; WhatsApp Deep Link</div>
                <h3 className="section-title">{modalPublicInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPublicInvoiceModalId(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-2">
              <div className="invoice-mini-preview">
                <div className="invoice-mini-brand">{appState.settings.businessName}</div>
                <div className="invoice-mini-head">
                  <div>
                    <small>{appState.settings.invoicePublicTitle}</small>
                    <strong>{modalPublicInvoice.invoiceNumber}</strong>
                    <span>
                      Token Publik: <code>{modalPublicInvoice.publicToken}</code>
                    </span>
                  </div>
                  <StatusPill status={modalPublicInvoice.status} />
                </div>
                <div className="invoice-mini-customer">
                  <span>Customer</span>
                  <strong>{modalPublicInvoice.customerName}</strong>
                  <small>{modalPublicInvoice.customerWhatsapp}</small>
                </div>
                {modalPublicOrder.items.map(it => (
                  <div key={it.orderItemId} className="invoice-mini-row">
                    <span>
                      {it.productTitle} × {it.quantity}
                    </span>
                    <strong>{formatIDR(it.lineTotal)}</strong>
                  </div>
                ))}
                <div className="invoice-mini-row">
                  <span>Delivery ({modalPublicOrder.fulfillmentType})</span>
                  <strong>{formatIDR(modalPublicOrder.deliveryFee)}</strong>
                </div>
                <div className="invoice-mini-total">
                  <span>Grand Total</span>
                  <strong>{formatIDR(modalPublicInvoice.grandTotal)}</strong>
                </div>
                <div className="invoice-mini-row">
                  <span>Paid / Remaining</span>
                  <strong>
                    {formatIDR(modalPublicInvoice.paidAmount)} /{' '}
                    {formatIDR(modalPublicInvoice.remainingAmount)}
                  </strong>
                </div>
                <p>{appState.settings.invoicePublicNote}</p>
              </div>

              <div>
                <div className="page-eyebrow" style={{ marginBottom: 8 }}>
                  WhatsApp Message Preview (Manual Deep-Link)
                </div>
                {(() => {
                  const msg = renderWhatsAppTemplate(appState.settings.invoiceWhatsappTemplate, {
                    customer_name: modalPublicInvoice.customerName,
                    business_name: appState.settings.businessName,
                    invoice_number: modalPublicInvoice.invoiceNumber,
                    grand_total: formatIDR(modalPublicInvoice.grandTotal),
                    remaining_amount: formatIDR(modalPublicInvoice.remainingAmount),
                    delivery_fee: formatIDR(modalPublicOrder.deliveryFee),
                    due_at: modalPublicInvoice.dueAt.replace('T', ' ').slice(0, 16) + ' WIB',
                    invoice_pdf_url: `https://twolittlebites.id/public/invoices/${modalPublicInvoice.publicToken}`
                  });
                  const waHref = buildWhatsAppDeepLink(
                    modalPublicInvoice.customerWhatsapp,
                    msg,
                    appState.settings.whatsappCountryCode
                  );
                  return (
                    <>
                      <div className="whatsapp-phone-preview">
                        <div className="whatsapp-preview-head">
                          <span className="material-symbols-outlined">chat</span>
                          <div>
                            <strong>{modalPublicInvoice.customerName}</strong>
                            <small>{modalPublicInvoice.customerWhatsapp}</small>
                          </div>
                        </div>
                        <div className="whatsapp-preview-chat">
                          <div
                            className="whatsapp-preview-bubble"
                            style={{ whiteSpace: 'pre-wrap' }}
                          >
                            {msg}
                          </div>
                        </div>
                      </div>
                      <div className="inline-actions" style={{ marginTop: 14 }}>
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className="primary-btn"
                        >
                          <span className="material-symbols-outlined">open_in_new</span> Buka
                          WhatsApp (wa.me)
                        </a>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Browser Thermal Receipt (58/80mm) & Kitchen Ticket Modal */}
      {modalPrintInvoice && modalPrintOrder && printModalState && (
        <div className="modal-overlay" onClick={() => setPrintModalState(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">
                  {printModalState.mode === 'receipt'
                    ? `Thermal Receipt (${appState.settings.receiptPaperSize} mm)`
                    : 'Kitchen Production Ticket'}
                </div>
                <h3 className="section-title">{modalPrintInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPrintModalState(null)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div
              className="thermal-receipt-preview"
              data-paper-size={appState.settings.receiptPaperSize}
              style={{ margin: '0 auto 18px' }}
            >
              {appState.settings.receiptShowLogo && (
                <div className="thermal-preview-logo">{appState.settings.businessName}</div>
              )}
              <strong>
                {printModalState.mode === 'receipt' ? 'RECEIPT' : 'KITCHEN TICKET'}
              </strong>
              <small>
                {modalPrintOrder.orderId} · {modalPrintOrder.fulfillmentDate}
              </small>
              <div className="thermal-preview-rule"></div>
              {modalPrintOrder.items.map(it => (
                <div key={it.orderItemId} className="thermal-preview-row">
                  <span>
                    {it.productTitle} × {it.quantity}
                  </span>
                  <strong>
                    {printModalState.mode === 'receipt'
                      ? formatIDR(it.lineTotal)
                      : `${it.quantity} pcs`}
                  </strong>
                </div>
              ))}
              <div className="thermal-preview-rule"></div>
              {printModalState.mode === 'receipt' ? (
                <>
                  <div className="thermal-preview-row thermal-preview-total">
                    <span>TOTAL</span>
                    <strong>{formatIDR(modalPrintInvoice.grandTotal)}</strong>
                  </div>
                  <div className="thermal-preview-row">
                    <span>Paid ({modalPrintInvoice.lastPaymentMethod})</span>
                    <strong>{formatIDR(modalPrintInvoice.paidAmount)}</strong>
                  </div>
                </>
              ) : (
                <div className="thermal-preview-row">
                  <span>Fulfillment</span>
                  <strong>{modalPrintOrder.fulfillmentType}</strong>
                </div>
              )}
              {appState.settings.receiptShowCustomer && (
                <div className="thermal-preview-customer">
                  {modalPrintInvoice.customerName} · {modalPrintInvoice.customerWhatsapp}
                </div>
              )}
              {modalPrintOrder.notes && (
                <small style={{ display: 'block', marginTop: 6 }}>
                  Catatan: {modalPrintOrder.notes}
                </small>
              )}
            </div>

            <div className="inline-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPrintModalState(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => window.print()}
              >
                <span className="material-symbols-outlined">print</span> Browser Print Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase DEV Auth Status & Login Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="section-head">
              <div>
                <div className="page-eyebrow">Supabase DEV Connection</div>
                <h3 className="section-title">Autentikasi &amp; Konfigurasi Project DEV</h3>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowAuthModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {auth.kind === 'unconfigured' && (
              <div>
                <p className="section-copy" style={{ marginBottom: 12 }}>
                  Status Koneksi Supabase: <strong>Belum dikonfigurasi ({auth.message})</strong>
                </p>
                <p className="section-copy">
                  Saat ini Anda sedang menjelajahi <strong>UI Parity 12 Halaman (Mode Lokal Interaktif)</strong>.
                  Untuk menghubungkan ke proyek Supabase DEV nyata, salin <code>.env.example</code> menjadi{' '}
                  <code>.env.local</code> dan isi <code>VITE_DEV_PROJECT_REF</code>,{' '}
                  <code>VITE_SUPABASE_URL</code>, serta <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
                </p>
              </div>
            )}

            {auth.kind === 'signedOut' && (
              <form className="form-grid" onSubmit={handleSupabaseLogin}>
                <label className="form-field span-2">
                  <span>Email Staff Supabase DEV</span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                  />
                </label>
                <label className="form-field span-2">
                  <span>Kata Sandi</span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                </label>
                {loginError && (
                  <p role="alert" className="alert span-2">
                    {loginError}
                  </p>
                )}
                <div className="span-2 form-actions">
                  <button type="submit" className="primary-btn" disabled={loginBusy}>
                    {loginBusy ? 'Memproses…' : 'Masuk ke Supabase DEV'}
                  </button>
                </div>
              </form>
            )}

            {auth.kind === 'signedIn' && (
              <div>
                <p className="section-copy" style={{ marginBottom: 14 }}>
                  Sesi Supabase DEV aktif sebagai <strong>{auth.user.email}</strong>.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => void signOut()}
                >
                  Keluar dari Sesi Supabase
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
