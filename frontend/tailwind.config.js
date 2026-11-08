/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: { preflight: true },
  theme: {
    extend: {
      colors: { plum: { DEFAULT: '#7c1c6f', dark: '#211019', light: '#f2eaf0' }, leaf: { DEFAULT: '#2d6b5a', light: '#e3efe9', bright: '#9fd8c4' }, ink: '#1b1916', paper: '#f5f2ea' },
      fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], sans: ['Figtree', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
    },
  },
  plugins: [],
};
