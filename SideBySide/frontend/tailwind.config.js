/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: 'rgba(24, 24, 32, 0.92)',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
  plugins: [],
};
