import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOTTER_SPLIT_MIN, BLOTTER_SPLIT_MAX, computeNewSplit } from '@/lib/resizeMath';

interface Props {
  split: number;
  onSplitChange: (next: number) => void;
  containerHeight: number;
}

export default function ResizeHandle({ split, onSplitChange, containerHeight }: Props) {
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ initialSplit: number; initialClientY: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragState.current = { initialSplit: split, initialClientY: event.clientY };
      setDragging(true);
    },
    [split],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      if (!dragState.current) return;
      const next = computeNewSplit(
        dragState.current.initialSplit,
        dragState.current.initialClientY,
        event.clientY,
        containerHeight,
      );
      onSplitChange(next);
    };
    const onUp = () => {
      dragState.current = null;
      setDragging(false);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, containerHeight, onSplitChange]);

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
        'h-1 w-full shrink-0 cursor-row-resize select-none transition-colors duration-[100ms]',
        dragging ? 'bg-border-focus' : 'bg-border hover:bg-border-strong',
      )}
    />
  );
}
