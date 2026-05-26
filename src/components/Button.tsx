import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// Shared Button + HoldButton per docs/05 §3.1. Lifted from
// TicketFooter (FXSW-020) and SuggestionPanel (FXSW-026) inline
// copies in FXSW-030 once a second consumer arrived. The hold-to-confirm
// primitive uses a 600ms pointerDown timer with an `onDoubleClick`
// alt-confirm path; the visible progress overlay is the `holdgrow`
// keyframe defined in `global.css`.

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue text-white hover:bg-blue/85 border-blue',
  secondary: 'bg-bg-elevated text-text border-border hover:border-blue/60',
  danger: 'bg-red/15 text-red border-red/40 hover:bg-red/25',
  ghost:
    'bg-transparent text-text-dim border-border hover:border-blue/60 hover:text-text',
};

interface CommonProps {
  testId: string;
  children: ReactNode;
  inFlight?: boolean;
  variant: ButtonVariant;
}

export interface ButtonProps extends CommonProps {
  onClick: () => void;
}

export function Button({
  testId,
  children,
  inFlight,
  variant,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-in-flight={inFlight ? 'true' : undefined}
      disabled={inFlight}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-4 text-sm font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
      )}
    >
      {inFlight && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

const HOLD_MS = 600;

export interface HoldButtonProps extends CommonProps {
  onConfirm: () => void;
}

export function HoldButton({
  testId,
  children,
  inFlight,
  variant,
  onConfirm,
}: HoldButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  const cancel = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
  };
  const start = (): void => {
    if (inFlight) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      onConfirm();
      cancel();
    }, HOLD_MS);
  };
  // Double-click is the alternative confirm path per docs/02 §4.7.
  const onDoubleClick = (): void => {
    if (inFlight) return;
    onConfirm();
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <button
      type="button"
      data-testid={testId}
      data-in-flight={inFlight ? 'true' : undefined}
      data-holding={holding ? 'true' : undefined}
      aria-describedby={`${testId}-hint`}
      disabled={inFlight}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onDoubleClick={onDoubleClick}
      className={clsx(
        'relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-sm border px-4 text-sm font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
      )}
    >
      {holding && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left center',
            background: 'currentColor',
            opacity: 0.25,
            animation: 'holdgrow 600ms linear forwards',
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">
        {inFlight && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {children}
      </span>
      <span id={`${testId}-hint`} className="sr-only">
        Hold for 600ms or double-click to confirm
      </span>
    </button>
  );
}
