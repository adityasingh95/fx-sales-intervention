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

  it('does NOT contain the string "Caplin" anywhere in rendered output', () => {
    const { container } = render(<App />);
    expect(container.textContent ?? '').not.toMatch(/caplin/i);
  });

  it('with ?dev=1 in the URL, the dev-injector slot is visible', () => {
    window.history.replaceState({}, '', '/?dev=1');
    render(<App />);
    expect(screen.getByTestId('dev-injector-slot')).toBeInTheDocument();
  });

  it('without ?dev=1, the dev-injector slot is not visible', () => {
    render(<App />);
    expect(screen.queryByTestId('dev-injector-slot')).toBeNull();
  });
});
