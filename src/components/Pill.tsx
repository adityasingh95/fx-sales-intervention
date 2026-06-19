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
    'bg-amber/12 text-amber border-amber/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(255,149,0,0.3)] backdrop-blur-sm',
  blue: 'bg-blue/10 text-blue border-blue/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(0,122,255,0.25)] backdrop-blur-sm',
  teal: 'bg-teal/10 text-teal border-teal/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(0,199,190,0.25)] backdrop-blur-sm',
  green:
    'bg-green/12 text-green border-green/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(52,199,89,0.3)] backdrop-blur-sm',
  red: 'bg-red/10 text-red border-red/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(255,59,48,0.25)] backdrop-blur-sm',
  grey: 'bg-grey-700/10 text-text-mute border-grey-700/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm',
  ai: 'bg-ai-bg text-ai-accent border-ai-border shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_0_0_0.5px_rgba(0,122,255,0.2)] backdrop-blur-sm',
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
