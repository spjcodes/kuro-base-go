import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEVICE_FALLBACK_LOCALE, initOptions, isAppLocale, type AppLocale } from './config';
import { installPluralRules } from './plural-rules';

export { useTranslation } from 'react-i18next';
export {
  APP_LOCALES,
  CATALOG_FALLBACK_LOCALE,
  DEVICE_FALLBACK_LOCALE,
  isAppLocale,
  isLocalePreference,
  resolveLocalePreference,
  type AppLocale,
  type LocalePreference,
} from './config';

/** The device's preferred language, narrowed to one we ship. */
export function deviceLocale(): AppLocale {
  try {
    const languageCode = getLocales()[0]?.languageCode;
    return isAppLocale(languageCode) ? languageCode : DEVICE_FALLBACK_LOCALE;
  } catch {
    // getLocales reads platform APIs that do not exist during the web build's
    // static render, where this module still gets evaluated.
    return DEVICE_FALLBACK_LOCALE;
  }
}

// Before i18next is used at all: without it there is no way for a count to reach
// a plural form, and Chinese and Japanese would look for keys that do not exist.
installPluralRules();

i18next.use(initReactI18next).init({
  ...initOptions,
  // Starting from the device's language rather than a fixed one means the first
  // frame is already right for most people; a stored override arrives a moment
  // later, when the preferences provider has read storage.
  lng: deviceLocale(),
});

/**
 * Switches the active language for the whole app.
 *
 * Both the UI (through react-i18next) and the next API request's
 * `Accept-Language` header follow from this - see RootLayoutNav, which sets the
 * header from the resolved locale.
 */
export function setLocale(locale: AppLocale): void {
  if (i18next.resolvedLanguage !== locale) void i18next.changeLanguage(locale);
}

export default i18next;
