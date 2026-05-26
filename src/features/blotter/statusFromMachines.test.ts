import { describe, expect, it } from 'vitest';
import { derivedStatus } from './statusFromMachines';

// One test per row of the docs/03 §6 mapping table.
// (rfsState, siState, dealable, expected)
const cases: Array<[string, string, boolean, string]> = [
  ['Queued', 'Initial', true, 'INTERVENE'],
  ['Queued', 'PickUpSent', false, 'PICKING UP'],
  ['PickedUp', 'PickedUp', false, 'PICKED UP'],
  ['Executable', 'Quoted', false, 'STREAMING'],
  ['Executable', 'WithdrawSent', false, 'WITHDRAWING'],
  ['PickedUp', 'HoldSent', false, 'RELEASING'],
  // RejectSent can come from PickedUp (RFS=PickedUp) or Quoted (RFS=Executable).
  ['PickedUp', 'RejectSent', false, 'REJECTING'],
  ['Executable', 'RejectSent', false, 'REJECTING'],
  ['Executable', 'Initial', false, 'AUTO'],
  ['TradeConfirmed', 'TradeConfirmed', false, 'DONE'],
  ['PickedUp', 'TraderRejected', false, 'REJECTED'],
  ['Executable', 'ClientRejected', false, 'DECLINED'],
  ['Expired', 'Initial', true, 'EXPIRED'],
];

describe('derivedStatus', () => {
  it.each(cases)(
    'rfs=%s + si=%s + dealable=%s → %s',
    (rfs, si, dealable, expected) => {
      expect(derivedStatus(rfs, si, dealable)).toBe(expected);
    },
  );
});
