import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent: deep magenta (#be185d, hover #9d174d). Deliberate choice: a warm, caring
        // read for a family-caregiving finance tool. It is clearly pink-magenta (rose-700 family),
        // NOT in the fuchsia/violet band, NOT the sibling wine-crimson #9f1239 and NOT the signal
        // red #b91c1c, so it stays distinct from every sibling accent.
        brand: { DEFAULT: '#be185d', hover: '#9d174d', tint: '#fdf2f8' },
        ink: { DEFAULT: '#18181b', soft: '#52525b', faint: '#71717a' },
        hair: '#e4e4e7',
        ground: '#fcfcfd',
        warn: '#a16207',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { btn: '8px', card: '10px', field: '8px' },
    },
  },
  plugins: [],
};
export default config;
