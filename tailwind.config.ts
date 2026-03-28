import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0066FF',
          'blue-dark': '#0044CC',
          violet: '#3B1FCC',
          cyan: '#00E5FF',
        },
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.03em',
      },
    },
  },
  plugins: [],
};

export default config;
