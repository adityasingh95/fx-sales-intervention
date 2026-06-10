import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import { BLOTTER_SPLIT_MIN, BLOTTER_SPLIT_MAX, computeNewSplit } from '@/lib/resizeMath';

interface Props {
  split: number;
  onSplitChange: (next: number) => void;
  // Live ref to the flex container the handle measures against. Reading
  // clientHeight at move-time avoids state-timing issues where a stale
  // `containerHeight` prop would be 0 on first interaction.
  containerRef: React.RefObject<HTMLElement>;
}

export default function ResizeHandle({ split, onSplitChange, containerRef }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ initialSplit: number; initialClientY: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragState.current = { initialSplit: split, initialClientY: event.clientY };
      setDragging(true);

      const target = event.currentTarget;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // jsdom or older browsers may not implement setPointerCapture; safe to ignore.
      }

      const onMove = (ev: PointerEvent): void => {
        if (!dragState.current) return;
        const height = containerRef.current?.clientHeight ?? 0;
        if (height <= 0) return;
        const next = computeNewSplit(
          dragState.current.initialSplit,
          dragState.current.initialClientY,
          ev.clientY,
          height,
        );
        onSplitChange(next);
      };
      const onUp = (): void => {
        dragState.current = null;
        setDragging(false);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    },
    [split, containerRef, onSplitChange],
  );

  return (
    <div
      data-testid="blotter-resize-handle"
      data-dragging={dragging ? 'true' : undefined}
      role="separator"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(split)}
      aria-valuemin={BLOTTER_SPLIT_MIN}
      aria-valuemax={BLOTTER_SPLIT_MAX}
      aria-label="Resize blotter split"
      onPointerDown={handlePointerDown}
      className={clsx(
        'group relative flex h-2 w-full shrink-0 cursor-row-resize select-none items-center justify-center touch-none',
      )}
    >
      <div
        aria-hidden
        className={clsx(
          'h-px w-full transition-colors duration-[100ms]',
          dragging
            ? 'bg-border-focus shadow-[0_0_0_1px_rgba(99,102,241,0.4)]'
            : 'bg-border group-hover:bg-border-strong',
        )}
      />
    </div>
  );
}
