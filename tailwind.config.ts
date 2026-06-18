import type { Config } from 'tailwindcss';

// FXSW-046: colours reference space-separated RGB triples from tokens.css
// so they theme-flip via [data-theme='light']. The `rgb(var(...) / <alpha-value>)`
// form keeps Tailwind opacity modifiers working (e.g. `bg-blue/85`).
// Alpha-baked tokens (overlays, glass, AI wash, row-flash) are passed through
// as plain `var()` references since they're never used with the opacity modifier.

const solidColor = (token: string): string => `rgb(var(--color-${token}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-app': solidColor('bg-app'),
        'bg-panel': solidColor('bg-panel'),
        'bg-panel-2': solidColor('bg-panel-2'),
        'bg-elevated': solidColor('bg-elevated'),
        'bg-row-hover': solidColor('bg-row-hover'),
        'bg-overlay': 'var(--color-bg-overlay)',
        'bg-glass': 'var(--color-bg-glass)',

        border: solidColor('border'),
        'border-strong': solidColor('border-strong'),
        'border-focus': solidColor('border-focus'),

        text: solidColor('text'),
        'text-dim': solidColor('text-dim'),
        'text-mute': solidColor('text-mute'),

        amber: solidColor('amber'),
        'blue-soft': solidColor('blue-soft'),
        blue: solidColor('blue'),
        teal: solidColor('teal'),
        'teal-dim': solidColor('teal-dim'),
        green: solidColor('green'),
        red: solidColor('red'),
        'grey-500': solidColor('grey-500'),
        'grey-700': solidColor('grey-700'),

        'ai-accent': solidColor('ai-accent'),
        'ai-accent-2': solidColor('ai-accent-2'),
        'ai-bg': 'var(--color-ai-bg)',
        'ai-border': 'var(--color-ai-border)',

        'tick-up': solidColor('tick-up'),
        'tick-down': solidColor('tick-down'),
        'focus-ring': solidColor('focus-ring'),
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
      },
      borderRadius: {
        sm: '5px',
        md: '8px',
        lg: '12px',
        xl: '18px',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '18px',
        xl: '26px',
        '2xl': '32px',
      },
      lineHeight: {
        tight: '1.2',
        base: '1.45',
      },
      letterSpacing: {
        tight: '-0.01em',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        ticket: 'var(--shadow-ticket)',
        ai: 'var(--shadow-ai)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        'row-flash': 'row-flash 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
