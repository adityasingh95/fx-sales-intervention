import type { Deal } from '@/types/deal';

// FXSW-091 (F-1): a visible note when a swap's requested legs were coerced (far
// missing / far ≤ near / last-tenor near stepped back). Renders nothing for a
// valid request — `deal.swapRequested` is set only when the legs were adjusted —
// so the operator can never be silently shown a different tenor pair than asked.
export default function SwapAdjustNote({ deal }: { deal: Deal }) {
  const requested = deal.swapRequested;
  if (!requested) return null;
  const legs = deal.legs ?? [];
  const appliedNear = legs[0]?.tenor ?? deal.tenor;
  const appliedFar = legs[1]?.tenor ?? deal.tenor;
  const requestedFar = requested.far ?? 'none';

  return (
    <p
      data-testid="swap-adjust-note"
      className="rounded-sm border border-amber/50 bg-bg-elevated/40 p-2 text-[11px] leading-snug text-text-dim"
    >
      Legs adjusted: requested NEAR {requested.near} / FAR {requestedFar} is not a
      valid forward-forward (far must be strictly later than near). Pricing{' '}
      <span className="font-mono">NEAR {appliedNear} → FAR {appliedFar}</span>.
    </p>
  );
}
