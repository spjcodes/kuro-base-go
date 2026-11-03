import type { InitOptions } from 'i18next';

import { en } from './locales/en';
import { ja } from './locales/ja';
import { zh } from './locales/zh';

/** The languages the app ships, in the order the switcher lists them. */
export const APP_LOCALES = ['zh', 'en', 'ja'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/** What the user picked. `system` defers to the device's own language. */
export type LocalePreference = 'system' | AppLocale;

/**
 * Where a device whose language we do not ship lands.
 */
export const DEVICE_FALLBACK_LOCALE: AppLocale = 'en';

/**
 * Where a *key* missing from the active catalog lands. That is English because
 * en.ts is the reference catalog - the one that is always complete.
 */
export const CATALOG_FALLBACK_LOCALE: AppLocale = 'en';

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (APP_LOCALES as readonly string[]).includes(value);
}

/**
 * The stored preference accepts one value the language list does not: `system`.
 *
 * Kept apart from isAppLocale because the two answer different questions. The
 * preferences provider has to tell "the user chose to follow the device" apart
 * from "there is nothing stored yet", and isAppLocale answers false for both.
 */
export function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || isAppLocale(value);
}

/**
 * What a stored value means, and whether there was one.
 *
 * Lives here rather than inline in the provider so the rule can be checked
 * without a device - it is the rule that decides which language the switcher
 * opens on, and getting it wrong is silent: the app would just come up in a
 * language nobody chose.
 *
 * Three cases, and the difference between the first two is the whole point of
 * returning `wasStored`:
 *
 *   - an unusable or absent value falls back to the device's language, and the
 *     caller is expected to WRITE THAT BACK, so that `system` stays a choice the
 *     user makes rather than the state every new install is silently in;
 *   - a stored `system` is a choice and is left alone, so the device's language
 *     is then re-read on every launch;
 *   - a stored language is kept as is.
 */
export function resolveLocalePreference(
  stored: unknown,
  systemLocale: AppLocale
): { preference: LocalePreference; wasStored: boolean } {
  return isLocalePreference(stored)
    ? { preference: stored, wasStored: true }
    : { preference: systemLocale, wasStored: false };
}

export const resources = {
  zh: { translation: zh },
  en: { translation: en },
  ja: { translation: ja },
};

/**
 * The whole of i18next's configuration bar the starting language, which depends
 * on the device and so is supplied by index.ts.
 *
 * Kept apart from the entry point because that one reaches for
 * `expo-localization`, and with it React Native - which makes the entry point
 * impossible to load outside the app. This half is plain data, so the plural
 * behaviour can be checked directly against the real catalogs.
 */
export const initOptions: InitOptions = {
  resources,
  fallbackLng: CATALOG_FALLBACK_LOCALE,
  supportedLngs: [...APP_LOCALES],
  // A tag like `zh-Hans` still belongs to `zh` rather than being unsupported.
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  // The catalogs are bundled, so there is nothing to await. Without this the
  // first render can come up in the fallback language and then swap.
  initAsync: false,
  interpolation: {
    // React escapes for us; escaping twice turns an apostrophe in a translated
    // string into a literal `&#39;` on screen.
    escapeValue: false,
  },
  returnNull: false,
};
