/** @type {import('tailwindcss').Config} */
// Ensure we can load the shared TypeScript preset in Node
let sharedPreset = {};
try {
    // Register ts-node on the fly to load TS preset without compiling
    require('ts-node').register({ transpileOnly: true });
    // Access default export from the TS module
    const mod = require('../tailwind.preset.ts');
    sharedPreset = mod.default || mod;
} catch (e) {
    console.warn(
        '[tailwind.config] Could not load ../tailwind.preset.ts – using nativewind preset only. Error:',
        e && e.message ? e.message : e
    );
}

module.exports = {
    content: [
        './app/**/*.{js,jsx,ts,tsx}',
        './components/**/*.{js,jsx,ts,tsx}',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')].concat(sharedPreset ? [sharedPreset] : []),
    theme: {
        extend: {
            // Mobile-specific extensions (if needed). Shared theme is in ../tailwind.preset.ts
        },
    },
    plugins: [],
};
