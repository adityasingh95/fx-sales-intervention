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
  amber: 'bg-amber text-bg-app',
  blue: 'bg-teal/80 text-bg-app',
  teal: 'bg-teal/80 text-bg-app',
  green: 'bg-green/30 text-green border border-green/40',
  red: 'bg-red text-bg-app',
  grey: 'border border-grey-700 text-text-mute',
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
        'inline-flex items-center px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-widest',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
