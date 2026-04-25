/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vr: {
          bg:          '#EBF0E5',
          surface:     '#DDE5D5',
          card:        '#FFFFFF',
          border:      '#C4D0B8',
          borderDeep:  '#A8BCA0',
          text:        '#161D14',
          muted:       '#627056',
          accent:      '#2D6A3F',
          accentMuted: '#D0E8D8',
          gold:        '#6B8C3A',
          goldBg:      '#E8F0D4',
          approved:    '#2D6A3F',
          rejected:    '#A0302A',
          pending:     '#7A6020',
          pendingBg:   '#F0E4C0',
        },
      },
      fontFamily: {
        display: ["'Cinzel'", "'Times New Roman'", 'serif'],
        body:    ["'Spectral'", "'Georgia'", 'serif'],
        mono:    ["'JetBrains Mono'", "'Courier New'", 'monospace'],
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
      },
      boxShadow: {
        card: '0 2px 24px rgba(22,29,20,0.08), 0 1px 3px rgba(22,29,20,0.04)',
        lg:   '0 8px 48px rgba(22,29,20,0.12), 0 2px 8px rgba(22,29,20,0.06)',
      },
    },
  },
  plugins: [],
}
