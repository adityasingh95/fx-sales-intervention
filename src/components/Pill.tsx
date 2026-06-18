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
  amber: 'bg-amber/20 text-amber border border-amber/40',
  blue: 'bg-blue/12 text-blue border border-blue/30',
  teal: 'bg-teal/12 text-teal border border-teal/30',
  green: 'bg-green/12 text-green border border-green/30',
  red: 'bg-red/12 text-red border border-red/30',
  grey: 'bg-grey-700/20 text-text-mute border border-grey-700/40',
  ai: 'bg-ai-bg text-ai-accent border border-ai-border',
};

export interface PillProps {
  color: PillColor;
  children: ReactNode;
}

export default function Pill({ color, children }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-tight',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
