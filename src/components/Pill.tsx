import clsx from 'clsx';
import type { ReactNode } from 'react';

export type PillColor =
  | 'amber'
  | 'blue'
  | 'teal'
  | 'green'
  | 'red'
  | 'grey'
  | 'ai';

const colorClasses: Record<PillColor, string> = {
  amber:
    'bg-amber/10 text-amber border-amber/30 shadow-[inset_0_1px_0_rgba(250,204,21,0.22)]',
  blue:
    'bg-teal/10 text-teal border-teal/25 shadow-[inset_0_1px_0_rgba(52,211,153,0.2)]',
  teal:
    'bg-teal/10 text-teal border-teal/25 shadow-[inset_0_1px_0_rgba(52,211,153,0.2)]',
  green:
    'bg-green/10 text-green border-green/20 shadow-[inset_0_1px_0_rgba(210,255,228,0.15)]',
  red:
    'bg-red/10 text-red border-red/25 shadow-[inset_0_1px_0_rgba(248,113,113,0.2)]',
  grey:
    'bg-grey-700/15 text-text-mute border-grey-700/20',
  ai:
    'bg-ai-bg text-ai-accent border-ai-border shadow-[inset_0_1px_0_rgba(134,239,172,0.15)]',
};

export interface PillProps {
  color: PillColor;
  children: ReactNode;
}

export default function Pill({ color, children }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-tight backdrop-blur-sm',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
