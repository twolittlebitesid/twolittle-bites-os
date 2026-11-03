export const orderTransitions = {
  DRAFT: ['WAITING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
  WAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SCHEDULED', 'IN_PRODUCTION', 'CANCELLED'],
  SCHEDULED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['ON_DELIVERY', 'COMPLETED', 'CANCELLED'],
  ON_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
} as const;

export type OrderStatus = keyof typeof orderTransitions;

export const orderStatuses = Object.keys(orderTransitions) as OrderStatus[];

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (orderTransitions[from] as readonly OrderStatus[]).includes(to);
}

export const canTransitionOrder = isValidOrderTransition;

/** UI preflight only; the database RPC MUST independently recheck every row. */
export function canPreviewBulkProgress(statuses: readonly OrderStatus[], target: OrderStatus): boolean {
  return statuses.length > 0 && statuses.length <= 100 && target !== 'CANCELLED' &&
    statuses.every(status => isValidOrderTransition(status, target));
}

export function validateBulkOrderSelection(
  orderIds: readonly string[]
): { ok: true } | { ok: false; reason: string } {
  if (orderIds.length === 0) {
    return { ok: false, reason: 'Pilih minimal 1 order terlebih dahulu.' };
  }
  if (orderIds.length > 100) {
    return { ok: false, reason: 'Maksimal 100 order per aksi bulk progress.' };
  }
  return { ok: true };
}
