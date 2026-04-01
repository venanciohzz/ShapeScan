/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        'serif-premium': ['Playfair Display', 'serif'],
      },
      colors: {
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          800: '#1F2937',
          900: '#111827',
        }
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(16, 185, 129, 0.3)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(16, 185, 129, 0.6)' },
        },
        'scan-line': {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1', boxShadow: '0 0 15px #10b981' },
          '90%': { opacity: '1', boxShadow: '0 0 15px #10b981' },
          '100%': { top: '100%', opacity: '0' },
        },
        loading: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' }
        }
      },
      animation: {
        'blob': 'blob 10s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s infinite',
        'scan-line': 'scan-line 2.5s linear infinite',
      },
      boxShadow: {
        'premium': '0 10px 40px -10px rgba(0,0,0,0.05)',
        'premium-hover': '0 20px 40px -10px rgba(0,0,0,0.1)',
        'card-glow': '0 0 20px -5px rgba(16, 185, 129, 0.2)',
        'card-glow-hover': '0 0 30px -5px rgba(16, 185, 129, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'premium-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      }
    },
  },
  plugins: [],
}
