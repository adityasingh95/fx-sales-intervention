import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Design tokens are exercised via file-content assertions rather than render-and-getComputedStyle.
// Rationale: jsdom does not process Tailwind utility classes nor resolve CSS custom properties via
// getComputedStyle (var() comes back as the literal string). The intent of the spec test — verify
// each token from 05-ui-ux-spec.md §1 is declared with the documented value — is fully covered here.
//
// FXSW-046: solid colour tokens are stored as space-separated RGB triples (e.g. `10 10 15`) so
// Tailwind's `rgb(var(--color-X) / <alpha-value>)` pattern can inject opacity from utility
// modifiers. The expected values below match that format. Alpha-baked tokens (overlays, glass,
// AI wash/border, row-flash) stay as `rgba(...)` strings since they're never used with the
// opacity modifier.

const tokensPath = resolve(__dirname, '../../src/styles/tokens.css');
const tokens = readFileSync(tokensPath, 'utf-8');

describe('design tokens — backgrounds (dark)', () => {
  it.each([
    ['--color-bg-app', '10 10 15'],
    ['--color-bg-panel', '17 17 24'],
    ['--color-bg-panel-2', '22 22 31'],
    ['--color-bg-elevated', '28 28 39'],
    ['--color-bg-row-hover', '31 31 43'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });

  it('declares overlay and glass with rgba values', () => {
    expect(tokens).toContain('--color-bg-overlay');
    expect(tokens).toContain('rgba(6, 6, 10, 0.72)');
    expect(tokens).toContain('--color-bg-glass');
    expect(tokens).toContain('rgba(22, 22, 31, 0.78)');
  });
});

describe('design tokens — borders (dark)', () => {
  it.each([
    ['--color-border', '35 35 47'],
    ['--color-border-strong', '46 46 61'],
    ['--color-border-focus', '99 102 241'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — text (dark)', () => {
  it.each([
    ['--color-text', '241 241 245'],
    ['--color-text-dim', '161 161 171'],
    ['--color-text-mute', '98 98 111'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — status colours (dark)', () => {
  it.each([
    ['--color-amber', '251 191 36'],
    ['--color-blue-soft', '122 167 255'],
    ['--color-blue', '59 130 246'],
    ['--color-teal', '20 196 168'],
    ['--color-teal-dim', '46 128 115'],
    ['--color-green', '34 197 94'],
    ['--color-red', '239 68 68'],
    ['--color-grey-500', '98 98 111'],
    ['--color-grey-700', '62 62 77'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });
});

describe('design tokens — AI accent family (dark)', () => {
  it.each([
    ['--color-ai-accent', '129 140 248'],
    ['--color-ai-accent-2', '167 139 250'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });

  it('declares AI wash and border with rgba values per spec', () => {
    expect(tokens).toContain('rgba(99, 102, 241, 0.08)');
    expect(tokens).toContain('rgba(129, 140, 248, 0.22)');
  });
});

describe('design tokens — functional colours (dark)', () => {
  it.each([
    ['--color-tick-up', '34 197 94'],
    ['--color-tick-down', '239 68 68'],
    ['--color-focus-ring', '99 102 241'],
  ])('declares %s as %s', (name, value) => {
    expect(tokens).toMatch(new RegExp(`${name}\\s*:\\s*${value}`));
  });

  it('declares row-flash as amber 30% rgba', () => {
    expect(tokens).toContain('rgba(251, 191, 36, 0.3)');
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

// FXSW-044 — light theme overrides.
describe('design tokens — light theme block', () => {
  it('declares a [data-theme=light] selector', () => {
    expect(tokens).toMatch(/\[data-theme=['"]light['"]\]/);
  });

  it.each([
    ['--color-bg-app', '242 244 247'],
    ['--color-bg-panel', '248 249 251'],
    ['--color-text', '15 18 25'],
    ['--color-amber', '200 116 0'],
    ['--color-green', '40 168 68'],
    ['--color-red', '220 48 38'],
    ['--color-ai-accent', '0 122 255'],
  ])('declares light %s as %s', (name, value) => {
    // Light override appears AFTER the dark default, so the last match wins.
    const matches = [...tokens.matchAll(new RegExp(`${name}\\s*:\\s*([\\d\\s]+);`, 'g'))];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[matches.length - 1][1].trim()).toBe(value);
  });

  it('declares light row-flash with lower alpha', () => {
    expect(tokens).toContain('rgba(200, 116, 0, 0.14)');
  });
});
