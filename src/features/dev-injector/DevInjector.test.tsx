import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DevInjector from './DevInjector';

describe('DevInjector', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the v1 scenario set at no query', () => {
    render(<DevInjector />);
    expect(screen.getByTestId('inject-HAPPY_PATH_ESP')).toBeInTheDocument();
    expect(screen.getByTestId('inject-OFF_HOURS_INTERVENTION')).toBeInTheDocument();
    expect(screen.getByTestId('inject-CREDIT_BREACH')).toBeInTheDocument();
    expect(screen.getByTestId('inject-SIZE_LIMIT_MARGIN_TUNE')).toBeInTheDocument();
    expect(screen.getByTestId('inject-RELEASE_PATH')).toBeInTheDocument();
    expect(screen.getByTestId('inject-RESET')).toBeInTheDocument();
  });

  it('does NOT surface v2 scenarios at no query / ?dev=1', () => {
    window.history.replaceState({}, '', '/?dev=1');
    render(<DevInjector />);
    expect(screen.queryByTestId('inject-BOTH_SIDED_INQUIRY')).toBeNull();
    expect(screen.queryByTestId('inject-QUOTE_DEALT_INQUIRY')).toBeNull();
  });

  it('surfaces v2 scenarios at ?dev=v2 alongside v1 scenarios', () => {
    window.history.replaceState({}, '', '/?dev=v2');
    render(<DevInjector />);
    expect(screen.getByTestId('inject-HAPPY_PATH_ESP')).toBeInTheDocument();
    expect(screen.getByTestId('inject-BOTH_SIDED_INQUIRY')).toBeInTheDocument();
    expect(screen.getByTestId('inject-QUOTE_DEALT_INQUIRY')).toBeInTheDocument();
  });
});
