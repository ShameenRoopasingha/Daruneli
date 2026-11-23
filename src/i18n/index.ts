import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import si from './si.json';
import ta from './ta.json';

export const LANGUAGE_STORAGE_KEY = 'suwa_preferred_language';

// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
    ta: { translation: ta },
  },
  lng: 'si',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Load persisted language asynchronously on startup
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  .then((savedLang) => {
    if (savedLang === 'si' || savedLang === 'en' || savedLang === 'ta') {
      // eslint-disable-next-line import/no-named-as-default-member
      void i18n.changeLanguage(savedLang);
    }
  })
  .catch(() => {});

export async function setAppLanguage(lang: 'si' | 'en' | 'ta'): Promise<void> {
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    console.warn('Failed to persist language preference:', err);
  }
}

export default i18n;
