/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        rail: 'var(--rail)',
        surface: 'var(--surface)',
        well: 'var(--well)',
        line: 'var(--line)',
        hair: 'var(--hair)',
        ink: 'var(--ink)',
        ink2: 'var(--ink-2)',
        ink3: 'var(--ink-3)',
        brand: 'var(--brand)',
        brandsoft: 'var(--brand-soft)',
        brandink: 'var(--brand-ink)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      fontSize: { '2xs': ['11px', '14px'] },
      boxShadow: {
        soft: '0 1px 2px rgba(29,29,31,.04), 0 1px 1px rgba(29,29,31,.03)',
        pop: '0 12px 32px rgba(29,29,31,.12), 0 2px 6px rgba(29,29,31,.06)',
        drawer: '-16px 0 40px rgba(29,29,31,.10)',
      },
    },
  },
  plugins: [],
}
