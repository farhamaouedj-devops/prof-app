/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: '#FDFBF5', dark: '#F5F0E8' },
        amber: { 50: '#FFF8E7', 100: '#FDEFC7', 400: '#F4C55A', 500: '#F4A924', 600: '#D4891A', 700: '#A86A10' },
        forest: { 50: '#EBF5F0', 100: '#C8E6D8', 400: '#4CAF82', 500: '#2A7A5B', 600: '#1F5C44', 700: '#154030' },
        ocean: { 50: '#EBF3FB', 100: '#C7DFF5', 400: '#5B97D4', 500: '#2B65A8', 600: '#1E4D85', 700: '#133562' },
        rose: { 500: '#E85D75', 600: '#D14560' },
        navy: { DEFAULT: '#1C1F33', 800: '#2A2E45', 700: '#383D5A' }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        bounceIn: { from: { opacity: 0, transform: 'scale(0.8)' }, to: { opacity: 1, transform: 'scale(1)' } }
      }
    }
  },
  plugins: []
}
