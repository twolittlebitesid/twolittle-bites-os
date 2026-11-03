import { describe, expect, it } from 'vitest';
import { canonicalSheets, legacyPageTemplates } from './catalog';

describe('Hotfix 19 source inventory', () => {
  it('records exactly 33 unique canonical Sheets', () => {
    expect(canonicalSheets).toHaveLength(33);
    expect(new Set(canonicalSheets).size).toBe(33);
  });
  it('records exactly 12 unique concrete page templates', () => {
    expect(legacyPageTemplates).toHaveLength(12);
    expect(new Set(legacyPageTemplates).size).toBe(12);
  });
  it('includes all protected ledger and snapshot sources', () => {
    for (const key of ['PAYMENTS', 'TRANSACTIONS', 'INVENTORY_MOVEMENTS', 'ORDER_ITEMS', 'PRODUCTION_REQUIREMENTS']) {
      expect(canonicalSheets).toContain(key);
    }
  });
});
