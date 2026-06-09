import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import ResizeHandle from './ResizeHandle';
import {
  BLOTTER_SPLIT_MIN,
  BLOTTER_SPLIT_MAX,
  computeNewSplit,
} from '@/lib/resizeMath';

// jsdom's PointerEvent constructor drops MouseEvent fields like clientY;
// dispatch a MouseEvent with the pointer-event name instead so `clientY`
// survives. Wrap in act so React state updates flush before assertions.
function firePointerDown(target: Element, clientY: number) {
  act(() => {
    target.dispatchEvent(new MouseEvent('pointerdown', { clientY, bubbles: true }));
  });
}
function firePointerMove(clientY: number) {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointermove', { clientY, bubbles: true }));
  });
}
function firePointerUp() {
  act(() => {
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });
}

describe('computeNewSplit', () => {
  it('returns the initial split when delta is zero', () => {
    expect(computeNewSplit(55, 400, 400, 800)).toBe(55);
  });

  it('increases split when the pointer moves down', () => {
    // 80px down on an 800px container = +10% → 65
    expect(computeNewSplit(55, 400, 480, 800)).toBe(65);
  });

  it('decreases split when the pointer moves up', () => {
    // 80px up on an 800px container = −10% → 45
    expect(computeNewSplit(55, 400, 320, 800)).toBe(45);
  });

  it('clamps to BLOTTER_SPLIT_MIN', () => {
    expect(computeNewSplit(30, 400, 0, 800)).toBe(BLOTTER_SPLIT_MIN);
  });

  it('clamps to BLOTTER_SPLIT_MAX', () => {
    expect(computeNewSplit(70, 400, 800, 800)).toBe(BLOTTER_SPLIT_MAX);
  });

  it('returns initial split when container height is zero (degenerate case)', () => {
    expect(computeNewSplit(55, 400, 480, 0)).toBe(55);
  });
});

describe('<ResizeHandle />', () => {
  function setup() {
    const onSplitChange = vi.fn();
    render(
      <ResizeHandle
        split={55}
        onSplitChange={onSplitChange}
        containerHeight={800}
      />,
    );
    return { handle: screen.getByTestId('blotter-resize-handle'), onSplitChange };
  }

  it('renders with the resize-handle testid', () => {
    setup();
    expect(screen.getByTestId('blotter-resize-handle')).toBeInTheDocument();
  });

  it('calls onSplitChange while the pointer is being dragged', () => {
    const { handle, onSplitChange } = setup();
    firePointerDown(handle, 400);
    firePointerMove(480);
    expect(onSplitChange).toHaveBeenLastCalledWith(65);
    firePointerMove(320);
    expect(onSplitChange).toHaveBeenLastCalledWith(45);
    firePointerUp();
  });

  it('does not call onSplitChange after pointerup', () => {
    const { handle, onSplitChange } = setup();
    firePointerDown(handle, 400);
    firePointerMove(480);
    expect(onSplitChange).toHaveBeenCalled();
    firePointerUp();
    onSplitChange.mockClear();
    firePointerMove(100);
    expect(onSplitChange).not.toHaveBeenCalled();
  });

  it('sets data-dragging="true" during drag and clears it on release', () => {
    const { handle } = setup();
    firePointerDown(handle, 400);
    expect(handle).toHaveAttribute('data-dragging', 'true');
    firePointerUp();
    expect(handle).not.toHaveAttribute('data-dragging');
  });
});
