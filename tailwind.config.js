/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: '#FF6B00',
        accent: '#22C55E',
        canvas: '#FFF8F2',
        ink: '#111827',
      },
      boxShadow: {
        glow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        soft: '0 16px 36px rgba(15, 23, 42, 0.10)',
      },
      borderRadius: {
        xl2: '1.75rem',
      },
      keyframes: {
        floatSoft: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        'float-soft': 'floatSoft 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
