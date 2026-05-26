// Derived blotter status from the (RFS, SI, dealable) tuple. The mapping
// is the row-for-row spec from docs/03 §6 — that table is the source of
// truth, this function is its executable form.

export type DisplayStatus =
  | 'INTERVENE'
  | 'PICKING UP'
  | 'PICKED UP'
  | 'STREAMING'
  | 'WITHDRAWING'
  | 'RELEASING'
  | 'REJECTING'
  | 'AUTO'
  | 'DONE'
  | 'REJECTED'
  | 'DECLINED'
  | 'EXPIRED';

export const derivedStatus = (
  rfsState: string,
  siState: string,
  dealable: boolean,
): DisplayStatus => {
  // Terminals first — these override whatever the partner machine is doing.
  if (rfsState === 'Expired') return 'EXPIRED';
  if (siState === 'TraderRejected') return 'REJECTED';
  if (siState === 'ClientRejected') return 'DECLINED';
  // DONE matches whenever RFS is TradeConfirmed. SI matches it too for
  // the SI-channel flow; for the ESP-channel flow SI stays at `Initial`
  // because there's no Sales Intervention involvement, so we shouldn't
  // require SI to also be TradeConfirmed.
  if (rfsState === 'TradeConfirmed') return 'DONE';

  // *Sent in-flight states next; the trader-facing status reflects the
  // in-flight action regardless of which RFS state the cross-send moved
  // us to.
  if (siState === 'RejectSent') return 'REJECTING';
  if (siState === 'WithdrawSent') return 'WITHDRAWING';
  if (siState === 'HoldSent') return 'RELEASING';
  if (siState === 'PickUpSent') return 'PICKING UP';

  // Live (RFS, SI) combinations.
  if (rfsState === 'Executable' && siState === 'Quoted') return 'STREAMING';
  if (rfsState === 'PickedUp' && siState === 'PickedUp') return 'PICKED UP';
  if (rfsState === 'Executable' && siState === 'Initial') return 'AUTO';
  if (rfsState === 'Queued' && siState === 'Initial' && dealable) return 'INTERVENE';

  // Fallback for undocumented (RFS, SI) tuples — the docs/03 §6 table
  // doesn't enumerate every possible combination because the cross-model
  // coordination prevents most of them at runtime. If we land here, the
  // safest label is the "awaiting trader attention" one.
  return 'INTERVENE';
};
