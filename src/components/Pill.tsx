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
  amber: 'bg-amber text-black border-transparent',
  blue: 'bg-blue text-black border-transparent',
  teal: 'bg-teal text-black border-transparent',
  green: 'bg-green text-black border-transparent',
  red: 'bg-red text-white border-transparent',
  grey: 'bg-grey-700 text-text-dim border-transparent',
  ai: 'bg-amber text-black border-transparent',
};

export interface PillProps {
  color: PillColor;
  children: ReactNode;
}

export default function Pill({ color, children }: PillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-none border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-tight',
        colorClasses[color],
      )}
    >
      {children}
    </span>
  );
}
