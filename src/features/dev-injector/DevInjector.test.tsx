import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DevInjector from './DevInjector';

describe('DevInjector', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('surfaces every scenario on the bare URL (no version gating)', () => {
    render(<DevInjector />);
    expect(screen.getByTestId('inject-HAPPY_PATH_ESP')).toBeInTheDocument();
    expect(screen.getByTestId('inject-OFF_HOURS_INTERVENTION')).toBeInTheDocument();
    expect(screen.getByTestId('inject-CREDIT_BREACH')).toBeInTheDocument();
    expect(screen.getByTestId('inject-SIZE_LIMIT_MARGIN_TUNE')).toBeInTheDocument();
    expect(screen.getByTestId('inject-RELEASE_PATH')).toBeInTheDocument();
    expect(screen.getByTestId('inject-BOTH_SIDED_INQUIRY')).toBeInTheDocument();
    expect(screen.getByTestId('inject-QUOTE_DEALT_INQUIRY')).toBeInTheDocument();
    expect(screen.getByTestId('inject-RESET')).toBeInTheDocument();
  });
});
