import Pill, { type PillColor } from '@/components/Pill';
import type { DisplayStatus } from './statusFromMachines';

// Pill color per the docs/02 §2 row-treatment table.
const COLOR_FOR: Record<DisplayStatus, PillColor> = {
  INTERVENE: 'amber',
  'PICKING UP': 'blue',
  'PICKED UP': 'blue',
  STREAMING: 'teal',
  WITHDRAWING: 'teal',
  RELEASING: 'amber',
  REJECTING: 'red',
  AUTO: 'grey',
  DONE: 'green',
  REJECTED: 'red',
  DECLINED: 'red',
  EXPIRED: 'grey',
};

export interface StatusCellProps {
  status: DisplayStatus;
}

export default function StatusCell({ status }: StatusCellProps) {
  return <Pill color={COLOR_FOR[status]}>{status}</Pill>;
}
