/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#4f46e5",
        "brand-2": "#4338ca",
      },
    },
  },
  plugins: [],
};
