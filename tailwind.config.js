/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        festive: {
          purple: '#35104F',
          purpleDark: '#35104F',
          purpleLight: '#4E1D70',
          orange: '#FF8A00',
          orangeHover: '#E87500',
          orangeLight: '#FFF0D9',
          cream: '#FFF8ED',
          card: '#FFFFFF',
          textPrimary: '#281735',
          textSecondary: '#66566F',
          textMuted: '#766B7D',
          border: '#EAD9C5',
          borderLight: '#F3E8DB',
          green: '#247447',
          greenLight: '#E8F5EE',
          red: '#B42318',
          redLight: '#FEE4E2',
          gold: '#FF8A00',
          goldLight: '#FFB049',
          charcoal: '#281735',
          dark: '#FFF8ED',
          surface: '#FFFFFF',
        }
      },
      backgroundImage: {
        'festive-gradient': 'linear-gradient(180deg, #FFF8ED 0%, #FFFFFF 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #FF8A00 0%, #FFB049 100%)',
        'fire-gradient': 'linear-gradient(135deg, #FF8A00 0%, #E57900 100%)',
        'purple-gradient': 'linear-gradient(135deg, #35104F 0%, #4E1D70 100%)',
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(53, 16, 79, 0.06), 0 1px 4px -1px rgba(53, 16, 79, 0.04)',
        'card-hover': '0 10px 24px -4px rgba(53, 16, 79, 0.12), 0 4px 8px -2px rgba(53, 16, 79, 0.06)',
        'diya': '0 4px 14px 0 rgba(255, 138, 0, 0.35)',
        'bottom-nav': '0 -4px 20px rgba(53, 16, 79, 0.08)',
      },
      animation: {
        'diya-flicker': 'diyaFlicker 3s ease-in-out infinite alternate',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        diyaFlicker: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
