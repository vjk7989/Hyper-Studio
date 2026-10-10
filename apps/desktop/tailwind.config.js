// Semantic tokens are var() chains, not colour channels, so Tailwind cannot
// build an rgba() from them. Wrapping them keeps `/50` working by emitting
// color-mix instead — without this, an opacity suffix silently does nothing.
// Without a modifier Tailwind passes `var(--tw-bg-opacity)` rather than
// undefined, so only mix when the alpha is a real number.
const token = (name) => ({ opacityValue }) => {
  const alpha = Number(opacityValue)
  return Number.isFinite(alpha) && alpha !== 1
    ? `color-mix(in srgb, var(${name}) ${alpha * 100}%, transparent)`
    : `var(${name})`
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./frontend/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── LTX.io design-system tokens ──
        // Defined in frontend/ds/styles/themes/themeVariables.scss and flipped
        // by ThemeProvider. Text takes `fg-*`, fills take the bare name.
        fg: {
          primary: token('--semantic-fg-primary'),
          secondary: token('--semantic-fg-secondary'),
          tertiary: token('--semantic-fg-tertiary'),
          white: token('--semantic-fg-white-enabled'),
          'white-hover': token('--semantic-fg-white-hover'),
          brand: token('--semantic-fg-brand-primary-enabled'),
          'brand-hover': token('--semantic-fg-brand-primary-hover'),
          danger: token('--semantic-fg-danger-primary-enabled'),
          warning: token('--semantic-fg-warning-primary-enabled'),
          success: token('--semantic-fg-success-primary-enabled'),
        },
        action: {
          DEFAULT: token('--semantic-bg-action-secondary-enabled'),
          hover: token('--semantic-bg-action-secondary-hover'),
          active: token('--semantic-bg-action-secondary-active'),
          selected: token('--semantic-bg-action-secondary-selected'),
        },
        brand: {
          DEFAULT: token('--semantic-bg-brand-primary-enabled'),
          hover: token('--semantic-bg-brand-primary-hover'),
        },
        danger: {
          DEFAULT: token('--semantic-bg-danger-primary-enabled'),
          hover: token('--semantic-bg-danger-primary-hover'),
          soft: token('--semantic-bg-danger-secondary-enabled'),
        },
        warning: {
          DEFAULT: token('--semantic-bg-warning-primary-enabled'),
          hover: token('--semantic-bg-warning-primary-hover'),
          soft: token('--semantic-bg-warning-secondary'),
        },
        success: {
          DEFAULT: token('--semantic-bg-success-primary-enabled'),
          hover: token('--semantic-bg-success-primary-hover'),
          soft: token('--semantic-bg-success-secondary'),
        },
        separator: {
          DEFAULT: token('--semantic-bg-separator-primary'),
          secondary: token('--semantic-bg-separator-secondary'),
        },
        // Decorative hues with no status meaning — feature accents, badges.
        ext: {
          teal: token('--semantic-extended-teal-enabled'),
          purple: token('--semantic-extended-purple-enabled'),
          indigo: token('--semantic-extended-indigo-enabled'),
        },
        'surface-primary': token('--semantic-bg-primary'),
        'surface-secondary': token('--semantic-bg-secondary'),
        'surface-tertiary': token('--semantic-bg-tertiary'),
        'surface-black': token('--semantic-bg-black-primary'),
        'surface-select': token('--semantic-bg-select'),
        'surface-overlay': token('--semantic-bg-overlay-universal'),
        // ── Semantic tokens via CSS variables ──
        // Change the variables in index.css :root to retheme
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark:    'rgb(var(--accent-dark) / <alpha-value>)',
        },
        'app-bg':  'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised:  'rgb(var(--surface-raised) / <alpha-value>)',
        },
        // Legacy blue utility names use the neutral Hyper-Studio brand scale.
        // All blue-* classes use this scale; update these values to retheme
        blue: {
          50:  '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // ── Legacy tokens (kept for compatibility) ──
        background: 'rgb(var(--bg) / <alpha-value>)',
        foreground: 'rgb(var(--text) / <alpha-value>)',
        card: 'rgb(var(--surface) / <alpha-value>)',
        'card-foreground': 'rgb(var(--text) / <alpha-value>)',
        border: 'rgb(var(--border-color) / <alpha-value>)',
        input: 'rgb(var(--surface-raised) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--primary-fg) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--surface-raised) / <alpha-value>)',
          foreground: 'rgb(var(--text) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          foreground: 'rgb(var(--text-muted) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}
