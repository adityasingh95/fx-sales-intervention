import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-app': '#0a0a0f',
        'bg-panel': '#111118',
        'bg-panel-2': '#16161f',
        'bg-elevated': '#1c1c27',
        'bg-row-hover': '#1f1f2b',
        'bg-overlay': 'rgba(6, 6, 10, 0.72)',
        'bg-glass': 'rgba(22, 22, 31, 0.78)',

        border: '#23232f',
        'border-strong': '#2e2e3d',
        'border-focus': '#6366f1',

        text: '#f1f1f5',
        'text-dim': '#a1a1ab',
        'text-mute': '#62626f',

        amber: '#fbbf24',
        'blue-soft': '#7aa7ff',
        blue: '#3b82f6',
        teal: '#14c4a8',
        'teal-dim': '#2e8073',
        green: '#22c55e',
        red: '#ef4444',
        'grey-500': '#62626f',
        'grey-700': '#3e3e4d',

        'ai-accent': '#818cf8',
        'ai-accent-2': '#a78bfa',
        'ai-bg': 'rgba(99, 102, 241, 0.08)',
        'ai-border': 'rgba(129, 140, 248, 0.22)',

        'tick-up': '#22c55e',
        'tick-down': '#ef4444',
        'focus-ring': '#6366f1',
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
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '14px',
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
        panel: '0 0 0 1px #23232f',
        ticket: '0 0 0 1px #2e2e3d, -16px 0 48px -8px rgba(0, 0, 0, 0.5)',
        ai: '0 0 0 1px rgba(129, 140, 248, 0.22), 0 1px 24px -4px rgba(99, 102, 241, 0.12)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
