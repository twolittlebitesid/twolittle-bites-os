import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppDeepLink,
  calculateInvoiceBalance,
  normalizeWhatsAppNumber,
  renderWhatsAppTemplate,
  scaleRecipe
} from './calculators';
import {
  APP_ROUTES,
  getDefaultRoute,
  getVisibleRoutes,
  hasPermission
} from './navigation';
import { legacyPageTemplates } from './catalog';

describe('Navigation and Role Permission Parity (Hotfix 19)', () => {
  it('maps all 12 legacy Page*.html templates to concrete routes', () => {
    expect(APP_ROUTES).toHaveLength(12);
    const mappedTemplates = APP_ROUTES.map(r => r.templateName).sort();
    expect(mappedTemplates).toEqual([...legacyPageTemplates].sort());
  });

  it('restricts routes accurately per role', () => {
    expect(getVisibleRoutes('OWNER')).toHaveLength(12);
    expect(getVisibleRoutes('PRODUCTION').map(r => r.id)).not.toContain('finance');
    expect(getVisibleRoutes('PRODUCTION').map(r => r.id)).not.toContain('marketing');
    expect(getVisibleRoutes('MARKETING').map(r => r.id)).not.toContain('production');
    expect(getDefaultRoute('OWNER')).toBe('executive');
    expect(getDefaultRoute('PRODUCTION')).toBe('orders');
    expect(hasPermission('FINANCE', 'PNL_READ')).toBe(true);
    expect(hasPermission('ADMIN', 'PNL_READ')).toBe(false);
  });
});

describe('Recipe Scaling & Invoice Ledger Calculators', () => {
  const sampleItems = [
    {
      itemId: 'ING-000001',
      materialName: 'Mascarpone',
      itemType: 'INGREDIENT' as const,
      quantityBase: 1000,
      baseUnit: 'g' as const,
      wasteAllowancePct: 5,
      unitCostBase: 180
    }
  ];

  it('scales EXACT mode with fractional multiplier and waste allowance', () => {
    const res = scaleRecipe(10, 25, 'EXACT', sampleItems);
    expect(res.multiplier).toBe(2.5);
    expect(res.expectedOutput).toBe(25);
    expect(res.surplus).toBe(0);
    expect(res.lines[0].requiredNetQuantity).toBe(2500);
    expect(res.lines[0].wasteQuantity).toBe(125);
    expect(res.lines[0].requiredGrossQuantity).toBe(2625);
  });

  it('scales FULL_BATCH mode by rounding up batches and reporting surplus', () => {
    const res = scaleRecipe(10, 25, 'FULL_BATCH', sampleItems);
    expect(res.multiplier).toBe(3);
    expect(res.expectedOutput).toBe(30);
    expect(res.surplus).toBe(5);
    expect(res.lines[0].requiredNetQuantity).toBe(3000);
  });

  it('derives invoice balance and status from SUCCESS and REFUND events', () => {
    const partial = calculateInvoiceBalance(400000, [
      { amount: 150000, status: 'SUCCESS' }
    ]);
    expect(partial.netPaid).toBe(150000);
    expect(partial.remaining).toBe(250000);
    expect(partial.status).toBe('PARTIAL');

    const paid = calculateInvoiceBalance(400000, [
      { amount: 150000, status: 'SUCCESS' },
      { amount: 250000, status: 'SUCCESS' }
    ]);
    expect(paid.status).toBe('PAID');
    expect(paid.remaining).toBe(0);

    const refunded = calculateInvoiceBalance(400000, [
      { amount: 400000, status: 'SUCCESS' },
      { amount: 400000, status: 'REFUND' }
    ]);
    expect(refunded.netPaid).toBe(0);
    expect(refunded.status).toBe('REFUNDED');
  });

  it('normalizes Indonesian WhatsApp numbers and renders templates', () => {
    expect(normalizeWhatsAppNumber('0812-8890-1122', '62')).toBe('6281288901122');
    const msg = renderWhatsAppTemplate('Halo {customer_name}, total {grand_total}', {
      customer_name: 'Nadia',
      grand_total: 'Rp400.000'
    });
    expect(msg).toBe('Halo Nadia, total Rp400.000');
    expect(buildWhatsAppDeepLink('081288901122', msg, '62')).toContain(
      'https://wa.me/6281288901122?text='
    );
  });
});
