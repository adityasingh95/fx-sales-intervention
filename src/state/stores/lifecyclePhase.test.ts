import { describe, expect, it } from 'vitest';
import { lifecyclePhaseFor } from './lifecyclePhase';

describe('lifecyclePhaseFor', () => {
  it('maps SI trader waypoints to phases', () => {
    expect(lifecyclePhaseFor('SI', 'PickUpSent')).toBe('PICKUP');
    expect(lifecyclePhaseFor('SI', 'QuoteSent')).toBe('PRICE_BACK');
    expect(lifecyclePhaseFor('SI', 'HoldSent')).toBe('RELEASE');
    expect(lifecyclePhaseFor('SI', 'WithdrawSent')).toBe('WITHDRAWN');
    expect(lifecyclePhaseFor('SI', 'TradeConfirmed')).toBe('RESPONSE');
    expect(lifecyclePhaseFor('SI', 'ClientRejected')).toBe('RESPONSE');
    expect(lifecyclePhaseFor('SI', 'TraderRejected')).toBe('RESPONSE');
  });

  it('does not log steady or ack-only SI states', () => {
    expect(lifecyclePhaseFor('SI', 'Initial')).toBeNull();
    expect(lifecyclePhaseFor('SI', 'PickedUp')).toBeNull();
    expect(lifecyclePhaseFor('SI', 'Quoted')).toBeNull();
    expect(lifecyclePhaseFor('SI', 'RejectSent')).toBeNull();
  });

  it('maps RFS phases for the ESP auto-priced path', () => {
    expect(lifecyclePhaseFor('RFS', 'Executable')).toBe('PRICE_BACK');
    expect(lifecyclePhaseFor('RFS', 'TradeConfirmed')).toBe('RESPONSE');
    expect(lifecyclePhaseFor('RFS', 'Expired')).toBe('RESPONSE');
    expect(lifecyclePhaseFor('RFS', 'ClientClosed')).toBe('RESPONSE');
  });

  it('returns null for unmapped RFS states', () => {
    expect(lifecyclePhaseFor('RFS', 'Queued')).toBeNull();
    expect(lifecyclePhaseFor('RFS', 'PickedUp')).toBeNull();
  });
});
