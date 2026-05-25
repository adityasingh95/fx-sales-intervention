import Chip from '@/components/Chip';
import type { RejectionReason } from '@/types/deal';

// User-facing labels per docs/02 §4.1.
const LABEL_FOR: Record<RejectionReason, string> = {
  OFF_HOURS: 'Outside trading window',
  SIZE_LIMIT: 'Size > auto-pricer band',
  CREDIT_LIMIT: 'Credit limit breach',
};

export interface ReasonsCellProps {
  reasons: RejectionReason[];
}

export default function ReasonsCell({ reasons }: ReasonsCellProps) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {reasons.map((r) => (
        <Chip key={r}>{LABEL_FOR[r]}</Chip>
      ))}
    </div>
  );
}
