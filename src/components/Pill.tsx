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
  amber: 'text-amber',
  blue: 'text-teal',
  teal: 'text-teal',
  green: 'text-green',
  red: 'text-red',
  grey: 'text-text-mute',
  ai: 'text-ai-accent',
};

export interface PillProps {
  color: PillColor;
  children: ReactNode;
}

export default function Pill({ color, children }: PillProps) {
  return (
    <span
      className={clsx(
        'font-mono text-xs font-bold tracking-widest',
        colorClasses[color],
      )}
    >
      [{children}]
    </span>
  );
}
