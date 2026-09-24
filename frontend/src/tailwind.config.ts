import type { Config } from 'tailwindcss';

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('c-bg'),
        surface: c('c-surface'),
        'surface-alt': c('c-surface-alt'),
        border: c('c-border'),
        ink: c('c-ink'),
        'ink-soft': c('c-ink-soft'),
        'ink-faint': c('c-ink-faint'),
        accent: c('c-accent'),
        'accent-contrast': c('c-accent-contrast'),
        danger: c('c-danger'),
        'danger-soft': c('c-danger-soft'),
        success: c('c-success'),
        'success-soft': c('c-success-soft'),
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
        display: ['var(--font-display)'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,.04)',
        panel: '0 10px 40px rgba(0,0,0,.12)',
        'panel-dark': '0 10px 40px rgba(0,0,0,.5)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-down': { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        'slide-down': 'slide-down 180ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;