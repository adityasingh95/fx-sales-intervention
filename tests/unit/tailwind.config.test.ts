import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';

const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>;
const spacing = (tailwindConfig.theme?.extend?.spacing ?? {}) as Record<string, string>;
const radius = (tailwindConfig.theme?.extend?.borderRadius ?? {}) as Record<string, string>;
const fontSize = (tailwindConfig.theme?.extend?.fontSize ?? {}) as Record<string, string>;
const fontFamily = (tailwindConfig.theme?.extend?.fontFamily ?? {}) as Record<string, string[]>;
const boxShadow = (tailwindConfig.theme?.extend?.boxShadow ?? {}) as Record<string, string>;

describe('tailwind config — colors', () => {
  it.each([
    ['bg-app', '#0a0a0f'],
    ['bg-panel', '#111118'],
    ['bg-panel-2', '#16161f'],
    ['bg-elevated', '#1c1c27'],
    ['bg-row-hover', '#1f1f2b'],
    ['border', '#23232f'],
    ['border-strong', '#2e2e3d'],
    ['border-focus', '#6366f1'],
    ['text', '#f1f1f5'],
    ['text-dim', '#a1a1ab'],
    ['text-mute', '#62626f'],
    ['amber', '#fbbf24'],
    ['blue', '#3b82f6'],
    ['blue-soft', '#7aa7ff'],
    ['teal', '#14c4a8'],
    ['teal-dim', '#2e8073'],
    ['green', '#22c55e'],
    ['red', '#ef4444'],
    ['ai-accent', '#818cf8'],
    ['ai-accent-2', '#a78bfa'],
    ['tick-up', '#22c55e'],
    ['tick-down', '#ef4444'],
    ['focus-ring', '#6366f1'],
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

describe('tailwind config — shadows', () => {
  it('declares panel, ticket, and ai shadows', () => {
    expect(boxShadow.panel).toBeDefined();
    expect(boxShadow.ticket).toBeDefined();
    expect(boxShadow.ai).toBeDefined();
    expect(boxShadow.ai).toContain('rgba(99, 102, 241');
  });
});
