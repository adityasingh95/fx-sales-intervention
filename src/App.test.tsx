import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders without error and contains "FX Sales Workstation"', () => {
    render(<App />);
    expect(screen.getByText('FX Sales Workstation')).toBeInTheDocument();
  });

  // FXSW-088 T-6: this is an intentional brand-neutrality denylist tripwire — the
  // vendor literal appears only inside a `.not.toMatch` guard that fails if the
  // name ever leaks into rendered output. Retained by design (it enforces the rule).
  it('does NOT contain the string "Caplin" anywhere in rendered output', () => {
    const { container } = render(<App />);
    expect(container.textContent ?? '').not.toMatch(/caplin/i);
  });

  it('renders the dev-injector slot on the bare URL (no flags required)', () => {
    render(<App />);
    expect(screen.getByTestId('dev-injector-slot')).toBeInTheDocument();
  });

  it('renders the blotter resize handle on the bare URL', () => {
    render(<App />);
    expect(screen.getByTestId('blotter-resize-handle')).toBeInTheDocument();
  });
});
