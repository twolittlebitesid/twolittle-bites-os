export type ScalingMode = 'EXACT' | 'FULL_BATCH';
export type PaymentEventStatus = 'SUCCESS' | 'REFUND' | 'FAILED';
export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'WAITING_PAYMENT'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED';

export interface RecipeBomInputItem {
  itemId: string;
  materialName: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  quantityBase: number;
  baseUnit: 'g' | 'ml' | 'pcs';
  wasteAllowancePct: number;
  unitCostBase: number;
}

export interface ScaledRecipeLine {
  itemId: string;
  materialName: string;
  itemType: 'INGREDIENT' | 'PACKAGING';
  baseUnit: 'g' | 'ml' | 'pcs';
  baseQuantity: number;
  requiredNetQuantity: number;
  wasteQuantity: number;
  requiredGrossQuantity: number;
  estimatedCost: number;
}

export interface ScaledRecipeResult {
  mode: ScalingMode;
  baseYield: number;
  targetQuantity: number;
  multiplier: number;
  expectedOutput: number;
  surplus: number;
  totalEstimatedCost: number;
  estimatedUnitCogs: number;
  lines: ScaledRecipeLine[];
}

export function formatIDR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return 'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(safe);
}

export function formatNumber(value: number, maxDecimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxDecimals }).format(safe);
}

/**
 * Exact formula from WORKFLOWS.md Section 4:
 * EXACT: multiplier = target_quantity / base_yield
 *        requirement = quantity_base * multiplier * (1 + waste_allowance_pct/100)
 * FULL_BATCH: batches = ceil(target_quantity / base_yield)
 *             expected_output = batches * base_yield
 *             surplus = expected_output - target_quantity
 */
export function scaleRecipe(
  baseYield: number,
  targetQuantity: number,
  mode: ScalingMode,
  items: RecipeBomInputItem[]
): ScaledRecipeResult {
  if (baseYield <= 0) {
    throw new Error('Base yield harus lebih besar dari 0.');
  }
  if (targetQuantity <= 0) {
    throw new Error('Target produksi harus lebih besar dari 0.');
  }

  const multiplier =
    mode === 'FULL_BATCH'
      ? Math.ceil(targetQuantity / baseYield)
      : targetQuantity / baseYield;

  const expectedOutput = mode === 'FULL_BATCH' ? multiplier * baseYield : targetQuantity;
  const surplus = Math.max(0, expectedOutput - targetQuantity);

  const lines: ScaledRecipeLine[] = items.map(item => {
    const requiredNetQuantity = item.quantityBase * multiplier;
    const wasteFactor = Math.max(0, item.wasteAllowancePct) / 100;
    const wasteQuantity = requiredNetQuantity * wasteFactor;
    const requiredGrossQuantity = requiredNetQuantity + wasteQuantity;
    const estimatedCost = Math.round(requiredGrossQuantity * item.unitCostBase);

    return {
      itemId: item.itemId,
      materialName: item.materialName,
      itemType: item.itemType,
      baseUnit: item.baseUnit,
      baseQuantity: item.quantityBase,
      requiredNetQuantity,
      wasteQuantity,
      requiredGrossQuantity,
      estimatedCost
    };
  });

  const totalEstimatedCost = lines.reduce((sum, l) => sum + l.estimatedCost, 0);
  const estimatedUnitCogs = expectedOutput > 0 ? Math.round(totalEstimatedCost / expectedOutput) : 0;

  return {
    mode,
    baseYield,
    targetQuantity,
    multiplier,
    expectedOutput,
    surplus,
    totalEstimatedCost,
    estimatedUnitCogs,
    lines
  };
}

/**
 * Exact formula from DATA_MODEL.md Section 4:
 * successful = SUM(payments.amount WHERE status='SUCCESS')
 * refunded   = SUM(payments.amount WHERE status='REFUND')
 * net_paid   = successful - refunded
 * remaining  = max(0, invoice.grand_total - net_paid)
 */
export function calculateInvoiceBalance(
  grandTotal: number,
  payments: { amount: number; status: PaymentEventStatus }[],
  currentStatus: InvoiceStatus = 'WAITING_PAYMENT'
): {
  successful: number;
  refunded: number;
  netPaid: number;
  remaining: number;
  status: InvoiceStatus;
} {
  if (currentStatus === 'CANCELLED') {
    return { successful: 0, refunded: 0, netPaid: 0, remaining: 0, status: 'CANCELLED' };
  }

  const successful = payments
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Math.round(p.amount), 0);
  const refunded = payments
    .filter(p => p.status === 'REFUND')
    .reduce((sum, p) => sum + Math.round(p.amount), 0);

  const netPaid = Math.max(0, successful - refunded);
  const remaining = Math.max(0, Math.round(grandTotal) - netPaid);

  let status: InvoiceStatus = currentStatus;
  if (successful > 0 && netPaid === 0 && refunded > 0) {
    status = 'REFUNDED';
  } else if (remaining === 0 && Math.round(grandTotal) > 0) {
    status = 'PAID';
  } else if (netPaid > 0 && remaining > 0) {
    status = 'PARTIAL';
  } else {
    status = currentStatus === 'OVERDUE' ? 'OVERDUE' : 'WAITING_PAYMENT';
  }

  return { successful, refunded, netPaid, remaining, status };
}

export function normalizeWhatsAppNumber(raw: string, countryCode = '62'): string {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return countryCode + digits.slice(1);
  }
  if (digits.startsWith(countryCode)) {
    return digits;
  }
  return countryCode + digits;
}

export function renderWhatsAppTemplate(
  template: string,
  placeholders: Record<string, string | number>
): string {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const val = placeholders[key];
    return val !== undefined && val !== null ? String(val) : `{${key}}`;
  });
}

export function buildWhatsAppDeepLink(phone: string, text: string, countryCode = '62'): string {
  const normalized = normalizeWhatsAppNumber(phone, countryCode);
  const encoded = encodeURIComponent(text);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
