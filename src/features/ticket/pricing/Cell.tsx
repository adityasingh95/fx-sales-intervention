import clsx from 'clsx';
import type { FlashDir } from './types';

// Trader bid/ask price cell (extracted from PricingPanel in FXSW-056).
// data-testid and all data-* attributes are unchanged so existing tests pass.

export interface CellProps {
  testId: string;
  label: string;
  flash: FlashDir;
  focused: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  value: string;
  onClick: () => void;
}

export default function Cell({
  testId,
  label,
  flash,
  focused,
  dimmed = false,
  disabled = false,
  value,
  onClick,
}: CellProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-flash={flash ?? undefined}
      data-focused={focused ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      className={clsx(
        'flex flex-1 flex-col items-center rounded-sm border bg-bg-elevated/70 px-3 py-2 transition-colors duration-[80ms] backdrop-blur-sm',
        focused && 'border-border-focus shadow-[0_0_0_1px_rgba(74,222,128,0.4),inset_0_1px_0_rgba(74,222,128,0.25)]',
        !focused && flash === 'up' && 'border-green',
        !focused && flash === 'down' && 'border-red',
        !focused && !flash && 'border-border',
        dimmed && !disabled && 'opacity-50',
        disabled && 'cursor-not-allowed opacity-[0.35]',
      )}
    >
      <span
        className="font-mono text-2xl tabular-nums text-text"
        style={{ textShadow: '0 0 14px rgba(210, 255, 228, 0.45)' }}
      >
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
        {label}
      </span>
    </button>
  );
}
