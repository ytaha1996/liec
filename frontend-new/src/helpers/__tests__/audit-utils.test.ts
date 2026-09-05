import { describe, it, expect } from 'vitest';
import { formatAuditEntry } from '../audit-utils';

describe('formatAuditEntry', () => {
  it('reads a status change in plain language', () => {
    expect(formatAuditEntry({ action: 'Status → Packed', oldValue: 'Received', newValue: 'Packed' }))
      .toEqual({ title: 'Status changed', detail: 'Received → Packed' });
  });

  it('humanises multi-word statuses', () => {
    const entry = formatAuditEntry({ action: 'Status → ReadyToShip', oldValue: 'Packed', newValue: 'ReadyToShip' });
    expect(entry.detail).toBe('Packed → Ready to Ship');
  });

  it('explains a package moved between shipments', () => {
    const entry = formatAuditEntry({
      action: 'MovedToShipment',
      oldValue: 'shipment=BEI-2601 status=ReadyToShip',
      newValue: 'shipment=BEI-2602 status=Packed',
    });
    expect(entry.title).toBe('Moved to another shipment');
    expect(entry.detail).toBe('BEI-2601 (Ready to Ship) → BEI-2602 (Packed)');
  });

  it('names a photo upload by its stage', () => {
    const entry = formatAuditEntry({
      action: 'MediaUpload',
      oldValue: null,
      newValue: 'stage=Departure key=media/packages/9/departure/2026/08/abc.jpg',
    });
    expect(entry.title).toBe('Photo uploaded');
    expect(entry.detail).toContain('Departure');
  });

  it('falls back to a readable title for an unknown action', () => {
    expect(formatAuditEntry({ action: 'PricingAdjustment', oldValue: 'fee=0', newValue: 'fee=500' }).title)
      .toBe('Pricing Adjustment');
  });
});
