/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        acg: {
          pink: '#FF6B9D',
          purple: '#C44DFF',
          cyan: '#00D4FF',
          teal: '#00FFB8',
          gold: '#FFD700',
          'dark-bg': '#1A1A2E',
          'dark-secondary': '#16213E',
          'dark-accent': '#2A2A4A',
        },
      },
      backgroundImage: {
        'acg-gradient': 'linear-gradient(135deg, #FF6B9D 0%, #C44DFF 100%)',
        'acg-gradient-cyan': 'linear-gradient(135deg, #00D4FF 0%, #00FFB8 100%)',
        'theater-dark': 'radial-gradient(ellipse at center, #2A2A4A 0%, #0A0A15 100%)',
        'subtle-acg': 'linear-gradient(180deg, rgba(26, 26, 46, 0) 0%, rgba(196, 77, 255, 0.05) 100%)',
      },
      boxShadow: {
        'acg-glow': '0 0 20px rgba(255, 107, 157, 0.4), 0 0 40px rgba(196, 77, 255, 0.2)',
        'acg-glow-sm': '0 0 10px rgba(255, 107, 157, 0.3), 0 0 20px rgba(196, 77, 255, 0.15)',
        'acg-card': '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 107, 157, 0.1)',
        'cyan-glow': '0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 255, 184, 0.2)',
      },
      animation: {
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8) rotate(180deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
