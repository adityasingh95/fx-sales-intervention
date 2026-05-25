import type { ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
}

export default function Chip({ children }: ChipProps) {
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-bg-elevated px-2 py-0.5 text-xs text-text-dim">
      {children}
    </span>
  );
}
