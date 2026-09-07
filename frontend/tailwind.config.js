/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00A859',
          lightGreen: '#E8F5E9',
          darkGreen: '#008746',
          bg: '#F8F9FA',
        }
      }
    },
  },
  plugins: [],
}
