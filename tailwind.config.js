/** @type {import('tailwindcss').Config} */
module.exports = {

  content: [
    "./options/**/*.{html,js}",
    "./content/**/*.{html,js}",
    "./lib/**/*.{js}"
  ],

  theme: {
    extend: {},
  },

  corePlugins: {
    preflight: false
  },

  plugins: [],
}