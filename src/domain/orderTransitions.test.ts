import { describe, expect, it } from 'vitest';
import { canPreviewBulkProgress, isValidOrderTransition, orderTransitions } from './orderTransitions';

describe('Exact Hotfix 19 order graph', () => {
  it('has nine states, including terminal COMPLETED/CANCELLED', () => {
    expect(Object.keys(orderTransitions)).toHaveLength(9);
    expect(orderTransitions.COMPLETED).toEqual([]);
    expect(orderTransitions.CANCELLED).toEqual([]);
  });
  it('permits legitimate forward steps but rejects backwards and terminal changes', () => {
    expect(isValidOrderTransition('DRAFT', 'CONFIRMED')).toBe(true);
    expect(isValidOrderTransition('READY', 'ON_DELIVERY')).toBe(true);
    expect(isValidOrderTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(isValidOrderTransition('IN_PRODUCTION', 'DRAFT')).toBe(false);
  });
  it('requires valid bulk targets for all selected, at most 100, and excludes cancel', () => {
    expect(canPreviewBulkProgress(Array(100).fill('DRAFT'), 'WAITING_PAYMENT')).toBe(true);
    expect(canPreviewBulkProgress(Array(101).fill('DRAFT'), 'WAITING_PAYMENT')).toBe(false);
    expect(canPreviewBulkProgress(['DRAFT', 'READY'], 'WAITING_PAYMENT')).toBe(false);
    expect(canPreviewBulkProgress(['DRAFT'], 'CANCELLED')).toBe(false);
  });
});
