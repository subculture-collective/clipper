import type { Config } from 'tailwindcss';
import preset from '../tailwind.preset';

const config: Config = {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Frontend-specific extensions (if needed)
      // Shared theme is in ../tailwind.preset.ts
    },
  },
  plugins: [],
};

export default config;
