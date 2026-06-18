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
  amber: 'bg-amber/15 text-amber border-amber/30 shadow-[0_0_8px_-2px_rgb(var(--color-amber)/0.4)]',
  blue: 'bg-blue/15 text-blue-soft border-blue/30 shadow-[0_0_8px_-2px_rgb(var(--color-blue)/0.4)]',
  teal: 'bg-teal/15 text-teal border-teal/30 shadow-[0_0_8px_-2px_rgb(var(--color-teal)/0.4)]',
  green: 'bg-green/15 text-green border-green/30 shadow-[0_0_8px_-2px_rgb(var(--color-green)/0.4)]',
  red: 'bg-red/15 text-red border-red/30 shadow-[0_0_8px_-2px_rgb(var(--color-red)/0.4)]',
  grey: 'bg-grey-700/30 text-text-dim border-grey-700',
  ai: 'bg-ai-bg text-ai-accent border-ai-border shadow-[0_0_8px_-2px_rgb(var(--color-ai-accent)/0.3)]',
};

export interface PillProps {
  color: PillColor;
  children: ReactNode;
}

export default function Pill({ color, children }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-tight',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
