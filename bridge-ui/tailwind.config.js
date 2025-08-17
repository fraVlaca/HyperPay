/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5b3cc4",
          50: "#f4f1fd",
          100: "#eae3fb",
          200: "#d3c8f7",
          300: "#b3a1ef",
          400: "#8d74e5",
          500: "#6f55d8",
          600: "#5b3cc4",
          700: "#4a31a1",
          800: "#3d2a83",
          900: "#312467",
          950: "#1d153d"
        },
        accent: {
          DEFAULT: "#ff9051"
        }
      }
    }
  },
  plugins: []
};
