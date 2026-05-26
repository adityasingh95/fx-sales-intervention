import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReasonsPanel from './ReasonsPanel';

describe('<ReasonsPanel />', () => {
  it("given ['OFF_HOURS'], renders one chip containing 'Outside trading window'", () => {
    render(<ReasonsPanel reasons={['OFF_HOURS']} />);
    const panel = screen.getByTestId('reasons-panel');
    const chips = panel.querySelectorAll('[data-reason]');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveAttribute('data-reason', 'OFF_HOURS');
    expect(panel).toHaveTextContent('Outside trading window');
  });

  it("given ['SIZE_LIMIT', 'CREDIT_LIMIT'], renders two chips with the right text", () => {
    render(<ReasonsPanel reasons={['SIZE_LIMIT', 'CREDIT_LIMIT']} />);
    const panel = screen.getByTestId('reasons-panel');
    const chips = panel.querySelectorAll('[data-reason]');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute('data-reason', 'SIZE_LIMIT');
    expect(chips[1]).toHaveAttribute('data-reason', 'CREDIT_LIMIT');
    expect(panel).toHaveTextContent('Notional exceeds auto-pricing band');
    expect(panel).toHaveTextContent('Client credit limit would be breached');
  });

  it('given [], renders nothing', () => {
    const { container } = render(<ReasonsPanel reasons={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
