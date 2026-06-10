import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>;
const spacing = (tailwindConfig.theme?.extend?.spacing ?? {}) as Record<string, string>;
const radius = (tailwindConfig.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
const fontSize = (tailwindConfig.theme?.extend?.fontSize ?? {}) as Record<string, string>;
const fontFamily = (tailwindConfig.theme?.extend?.fontFamily ?? {}) as Record<string, string[]>;
const boxShadow = (tailwindConfig.theme?.extend?.boxShadow ?? {}) as Record<string, string>;

// FXSW-046: Tailwind colour utilities now reference CSS variables in
// `rgb(var(--color-X) / <alpha-value>)` form so they theme-flip via
// [data-theme='light']. Alpha-baked tokens (overlays, glass, AI wash, AI border)
// pass through as direct `var()` references — they're never used with the
// opacity modifier.

describe('tailwind config — solid colours map to rgb(var(--color-X) / <alpha-value>)', () => {
  it.each([
    'bg-app',
    'bg-panel',
    'bg-panel-2',
    'bg-elevated',
    'bg-row-hover',
    'border',
    'border-strong',
    'border-focus',
    'text',
    'text-dim',
    'text-mute',
    'amber',
    'blue',
    'blue-soft',
    'teal',
    'teal-dim',
    'green',
    'red',
    'ai-accent',
    'ai-accent-2',
    'tick-up',
    'tick-down',
    'focus-ring',
  ])('maps %s to rgb(var(--color-X) / <alpha-value>)', (key) => {
    expect(colors[key]).toBe(`rgb(var(--color-${key}) / <alpha-value>)`);
  });
});

describe('tailwind config — alpha-baked colours pass through as var() references', () => {
  it.each([
    ['bg-overlay', 'var(--color-bg-overlay)'],
    ['bg-glass', 'var(--color-bg-glass)'],
    ['ai-bg', 'var(--color-ai-bg)'],
    ['ai-border', 'var(--color-ai-border)'],
  ])('maps %s to %s', (key, value) => {
    expect(colors[key]).toBe(value);
  });
});

describe('tailwind config — spacing', () => {
  it.each([
    ['1', '4px'],
    ['2', '8px'],
    ['3', '12px'],
    ['4', '16px'],
    ['5', '20px'],
    ['6', '24px'],
    ['8', '32px'],
    ['10', '40px'],
  ])('maps spacing.%s to %s', (key, value) => {
    expect(spacing[key]).toBe(value);
  });
});

describe('tailwind config — border radius', () => {
  it.each([
    ['sm', '4px'],
    ['md', '6px'],
    ['lg', '10px'],
    ['xl', '14px'],
  ])('maps borderRadius.%s to %s', (key, value) => {
    expect(radius[key]).toBe(value);
  });
});

describe('tailwind config — font size', () => {
  it.each([
    ['xs', '11px'],
    ['sm', '12px'],
    ['base', '13px'],
    ['md', '14px'],
    ['lg', '18px'],
    ['xl', '26px'],
    ['2xl', '32px'],
  ])('maps fontSize.%s to %s', (key, value) => {
    expect(fontSize[key]).toBe(value);
  });
});

describe('tailwind config — font families', () => {
  it('puts Geist first in sans stack', () => {
    expect(fontFamily.sans?.[0]).toBe('Geist');
  });

  it('puts Geist Mono first in mono stack', () => {
    expect(fontFamily.mono?.[0]).toBe('Geist Mono');
  });
});

describe('tailwind config — shadows reference CSS variables for theme-awareness', () => {
  it('declares panel, ticket, and ai shadows as var() references', () => {
    expect(boxShadow.panel).toBe('var(--shadow-panel)');
    expect(boxShadow.ticket).toBe('var(--shadow-ticket)');
    expect(boxShadow.ai).toBe('var(--shadow-ai)');
  });
});
