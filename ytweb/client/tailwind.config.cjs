module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fce1ef',
        lilac: '#d8c5ff',
        orchid: '#f2b5d4',
        midnight: '#2d1e2f',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        dreamy: '0 20px 45px rgba(232, 194, 224, 0.45)',
      },
    },
  },
  plugins: [],
};
