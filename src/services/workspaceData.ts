import { getSupabaseClient } from '../lib/supabase/client';
import type { PaymentEventStatus } from '../domain/calculators';
import type { OrderStatus } from '../domain/orderTransitions';

export type ApiResult<T> =
  | { ok: true; data: T; meta: { requestId: string; already_recorded?: boolean } }
  | {
      ok: false;
      error: { code: string; message: string; fieldErrors?: Record<string, string> };
      meta: { requestId: string };
    };

/**
 * Typed client adapter for Supabase Edge Functions / Transactional RPCs
 * per specs/API_CONTRACT.md. Never performs direct client DML on the 33 business tables.
 */
export async function invokeDomainAction<TResponse>(
  domain: string,
  action: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string
): Promise<ApiResult<TResponse>> {
  const client = getSupabaseClient();
  const requestId = crypto.randomUUID();
  const headers: Record<string, string> = {
    'x-request-id': requestId
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const { data, error } = await client.functions.invoke<ApiResult<TResponse>>(
    `${domain}/${action}`,
    {
      method: 'POST',
      headers,
      body: payload
    }
  );

  if (error) {
    return {
      ok: false,
      error: {
        code: 'EDGE_FUNCTION_ERROR',
        message: error.message || 'Gagal menghubungi Edge Function.'
      },
      meta: { requestId }
    };
  }

  return (
    data ?? {
      ok: false,
      error: { code: 'EMPTY_RESPONSE', message: 'Server tidak mengembalikan respons.' },
      meta: { requestId }
    }
  );
}

export const workspaceApi = {
  createOrder(payload: {
    customer_id: string;
    source_channel: string;
    preorder_campaign_id: string | null;
    fulfillment_type: string;
    fulfillment_date: string;
    delivery_fee: number;
    discount: number;
    tax: number;
    items: {
      product_id: string;
      variant_id: string | null;
      quantity: string;
      production_notes: string;
    }[];
    notes: string;
  }) {
    return invokeDomainAction<{ id: string; invoice_id?: string }>('orders', 'create', payload);
  },

  transitionOrderStatus(orderIds: string[], targetStatus: OrderStatus | 'NEXT') {
    return invokeDomainAction<{ updated: number }>('orders', 'bulk-progress', {
      order_ids: orderIds,
      target_status: targetStatus
    });
  },

  recordPayment(payload: {
    invoice_id: string;
    payment_at: string;
    amount: number;
    payment_method: string;
    reference_no: string;
    proof_upload_id?: string | null;
    status?: PaymentEventStatus;
    notes?: string;
  }) {
    return invokeDomainAction<{ payment_id: string }>(
      'payments',
      payload.status === 'REFUND' ? 'refund' : 'record',
      payload,
      payload.reference_no
    );
  },

  adjustInventory(payload: {
    item_type: 'INGREDIENT' | 'PACKAGING';
    item_id: string;
    counted_stock_base: string;
    reason: string;
    idempotency_key: string;
  }) {
    return invokeDomainAction<{ movement_id: string }>(
      'inventory',
      'adjustment',
      payload,
      payload.idempotency_key
    );
  },

  postProductionUsage(planId: string) {
    return invokeDomainAction<{ plan_id: string }>(
      'production',
      'post-usage-once',
      { plan_id: planId },
      `prod-usage-${planId}`
    );
  },

  receivePurchase(purchaseId: string) {
    return invokeDomainAction<{ purchase_id: string }>(
      'purchasing',
      'receive',
      { purchase_id: purchaseId },
      `po-receive-${purchaseId}`
    );
  }
};
