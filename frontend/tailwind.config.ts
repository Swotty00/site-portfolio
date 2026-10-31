import type { Config } from 'tailwindcss'

/**
 * Colours are exposed as CSS variables holding space-separated RGB channels so that
 * (a) Tailwind opacity modifiers work (`bg-primary/40`) and
 * (b) the Easter-egg theme switcher can re-colour the whole site at runtime.
 * Default values live in src/styles/index.css and mirror the brand palette below.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: channel('--c-bg'), // #084d6e
        accent: channel('--c-accent'), // #DCCBB5
        ink: channel('--c-ink'), // #D8DAD6
        brand: { navy: '#084d6e', sand: '#DCCBB5', ice: '#D8DAD6' },
      },
      fontFamily: {
        // Headings: Space Grotesk, falling back to wide grotesque system faces.
        display: [
          '"Space Grotesk Variable"',
          '"Space Grotesk"',
          '"Archivo Expanded"',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          '"PingFang SC"',
          '"Hiragino Sans"',
          '"Noto Sans CJK JP"',
          'sans-serif',
        ],
        sans: [
          '"DM Sans Variable"',
          '"DM Sans"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          '"Noto Sans"',
          '"PingFang SC"',
          '"Hiragino Sans"',
          '"Noto Sans CJK JP"',
          'sans-serif',
        ],
      },
      letterSpacing: { tightest: '-0.045em' },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
