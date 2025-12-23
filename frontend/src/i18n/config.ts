import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';

console.log('[i18n] Initializing...')

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    // Resources define the translations for each language
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      fr: { translation: frTranslations },
    },

    // Default language
    fallbackLng: 'en',

    // Supported languages
    supportedLngs: ['en', 'es', 'fr'],

    // Load languages on demand (for future lazy loading)
    load: 'languageOnly', // Use 'en' instead of 'en-US'

    // Detection options
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Keys for localStorage
      lookupLocalStorage: 'i18nextLng',

      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
  })
  .then(() => console.log('[i18n] Initialized successfully'))
  .catch((error) => console.error('[i18n] Failed to initialize:', error));

export default i18n;
