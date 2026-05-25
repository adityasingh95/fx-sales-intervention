import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Design tokens are exercised via file-content assertions rather than render-and-getComputedStyle.
// Rationale: jsdom does not process Tailwind utility classes nor resolve CSS custom properties via
// getComputedStyle (var() comes back as the literal string). The intent of the spec test — verify
// each token from 05-ui-ux-spec.md §1 is declared with the documented value — is fully covered here.
// See 02 ticket FXSW-002 acceptance.

const tokensPath = resolve(__dirname, '../../src/styles/tokens.css');
const tokens = readFileSync(tokensPath, 'utf-8');

describe('design tokens — backgrounds', () => {
  it.each([
    ['--color-bg-app', '#0a0a0f'],
    ['--color-bg-panel', '#111118'],
    ['--color-bg-panel-2', '#16161f'],
    ['--color-bg-elevated', '#1c1c27'],
    ['--color-bg-row-hover', '#1f1f2b'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value.replace('#', '#')}`));
  });

  it('declares overlay and glass with rgba values', () => {
    expect(tokens).toContain('--color-bg-overlay');
    expect(tokens).toContain('rgba(6, 6, 10, 0.72)');
    expect(tokens).toContain('--color-bg-glass');
    expect(tokens).toContain('rgba(22, 22, 31, 0.78)');
  });
});

describe('design tokens — borders', () => {
  it.each([
    ['--color-border', '#23232f'],
    ['--color-border-strong', '#2e2e3d'],
    ['--color-border-focus', '#6366f1'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — text', () => {
  it.each([
    ['--color-text', '#f1f1f5'],
    ['--color-text-dim', '#a1a1ab'],
    ['--color-text-mute', '#62626f'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — status colors', () => {
  it.each([
    ['--color-amber', '#fbbf24'],
    ['--color-blue-soft', '#7aa7ff'],
    ['--color-blue', '#3b82f6'],
    ['--color-teal', '#14c4a8'],
    ['--color-teal-dim', '#2e8073'],
    ['--color-green', '#22c55e'],
    ['--color-red', '#ef4444'],
    ['--color-grey-500', '#62626f'],
    ['--color-grey-700', '#3e3e4d'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — AI accent family', () => {
  it.each([
    ['--color-ai-accent', '#818cf8'],
    ['--color-ai-accent-2', '#a78bfa'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });

  it('declares AI wash and border with rgba values per spec', () => {
    expect(tokens).toContain('rgba(99, 102, 241, 0.08)');
    expect(tokens).toContain('rgba(129, 140, 248, 0.22)');
  });
});

describe('design tokens — functional colors', () => {
  it.each([
    ['--color-tick-up', '#22c55e'],
    ['--color-tick-down', '#ef4444'],
    ['--color-focus-ring', '#6366f1'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — typography', () => {
  it('declares font families', () => {
    expect(tokens).toContain('--font-sans');
    expect(tokens).toContain('"Geist"');
    expect(tokens).toContain('--font-mono');
    expect(tokens).toContain('"Geist Mono"');
  });

  it.each([
    ['--text-xs', '11px'],
    ['--text-sm', '12px'],
    ['--text-base', '13px'],
    ['--text-md', '14px'],
    ['--text-lg', '18px'],
    ['--text-xl', '26px'],
    ['--text-2xl', '32px'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });

  it('declares line heights and letter spacing', () => {
    expect(tokens).toMatch(/--line-tight\s*:\s*1\.2/);
    expect(tokens).toMatch(/--line-base\s*:\s*1\.45/);
    expect(tokens).toMatch(/--tracking-tight\s*:\s*-0\.01em/);
  });
});

describe('design tokens — spacing scale', () => {
  it.each([
    ['--space-1', '4px'],
    ['--space-2', '8px'],
    ['--space-3', '12px'],
    ['--space-4', '16px'],
    ['--space-5', '20px'],
    ['--space-6', '24px'],
    ['--space-8', '32px'],
    ['--space-10', '40px'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — radii', () => {
  it.each([
    ['--radius-sm', '4px'],
    ['--radius-md', '6px'],
    ['--radius-lg', '10px'],
    ['--radius-xl', '14px'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — shadows', () => {
  it('declares panel, ticket, and ai shadows', () => {
    expect(tokens).toContain('--shadow-panel');
    expect(tokens).toContain('--shadow-ticket');
    expect(tokens).toContain('--shadow-ai');
  });
});
