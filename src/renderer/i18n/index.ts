import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enRaw from './locales/en.json';
import deRaw from './locales/de.json';
import frRaw from './locales/fr.json';
import esRaw from './locales/es.json';
import jaRaw from './locales/ja.json';
import zhRaw from './locales/zh.json';
import { injectVersionIntoTranslations } from './versionInjector';

// Inject version into all translations
const en = injectVersionIntoTranslations(enRaw);
const de = injectVersionIntoTranslations(deRaw);
const fr = injectVersionIntoTranslations(frRaw);
const es = injectVersionIntoTranslations(esRaw);
const ja = injectVersionIntoTranslations(jaRaw);
const zh = injectVersionIntoTranslations(zhRaw);

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  ja: { translation: ja },
  zh: { translation: zh },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;