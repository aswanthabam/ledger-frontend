const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.font-normal': { fontFamily: 'Inter_400Regular', fontWeight: '400' },
        '.font-medium': { fontFamily: 'Inter_500Medium', fontWeight: '500' },
        '.font-semibold': { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
        '.font-bold': { fontFamily: 'Inter_700Bold', fontWeight: '700' },
        '.font-black': { fontFamily: 'Inter_900Black', fontWeight: '900' },
      });
    })
  ],
}
