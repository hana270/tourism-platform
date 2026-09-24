import type { Config } from 'tailwindcss';

/**
 * Palette IHOST — noir & blanc professionnel.
 * Toutes les couleurs sont pilotées par variables CSS (voir globals.css)
 * afin que le mode sombre/clair change instantanément sans flash,
 * et que la palette reste centralisée en un seul endroit.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-alt': 'rgb(var(--c-surface-alt) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-contrast': 'rgb(var(--c-accent-contrast) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        'success-soft': 'rgb(var(--c-success-soft) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgb(0 0 0 / 0.04)',
        panel: '0 8px 30px rgb(0 0 0 / 0.10)',
        'panel-dark': '0 8px 30px rgb(0 0 0 / 0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 140ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
