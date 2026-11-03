import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as z from 'zod';
import { en as zodEn, ja as zodJa, zhCN as zodZhCN } from 'zod/locales';

import { toLocaleTag } from '@/lib/format';
import {
  deviceLocale,
  resolveLocalePreference,
  setLocale,
  type AppLocale,
  type LocalePreference,
} from '@/lib/i18n';

/** `system` follows the device's setting; the other two pin it. */
export type ThemePreference = 'system' | 'light' | 'dark';

const LOCALE_STORAGE_KEY = '@prefs_locale';
const THEME_STORAGE_KEY = '@prefs_theme';

/**
 * zod's own messages - "String must contain at least 3 character(s)" and the
 * like - are English out of the box, and they reach the user directly, because
 * the generated schemas in client/zod.gen.ts carry bare constraints. Reading
 * their wording from a pack is how they follow the app's language without
 * editing that file, which the generator overwrites. `zhCN` rather than `zhTW`:
 * the catalog is written in simplified characters.
 */
const ZOD_LOCALES = { zh: zodZhCN, en: zodEn, ja: zodJa } as const;

interface PreferencesState {
  /** Always a concrete language - `system` has already been resolved away. */
  locale: AppLocale;
  localePreference: LocalePreference;
  setLocalePreference: (preference: LocalePreference) => void;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const PreferencesContext = createContext<PreferencesState | undefined>(undefined);

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Reads the preferences that outlive a session and applies them before the app
 * renders.
 *
 * Both live here rather than in separate providers because they are the same
 * shape of problem - one stored value, applied to a global, read by everything
 * below - and because the dark mode switch needs this to work at all: it drives
 * nativewind through `colorScheme.set`, which is in-memory only, so without a
 * stored copy the choice was lost on every reload.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  // Resolved once. A device language change while the app is running takes
  // effect at the next launch.
  const [systemLocale] = useState<AppLocale>(deviceLocale);

  // Opens on the device's own language rather than on `system`. The two behave
  // identically until something is stored, but they read very differently: a
  // switcher that starts on `system` shows a mode where the user expects to see
  // the language they are currently reading, and following the device would then
  // have no separate way to be expressed. Storage confirms or corrects this a
  // moment later.
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(systemLocale);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  const apply = useCallback(
    (nextLocale: LocalePreference, nextTheme: ThemePreference) => {
      const resolved = nextLocale === 'system' ? systemLocale : nextLocale;
      setLocale(resolved);
      z.config(ZOD_LOCALES[resolved]());
      applyDocumentLanguage(resolved);
      colorScheme.set(nextTheme);
    },
    [systemLocale]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [storedLocale, storedTheme] = await Promise.all([
          AsyncStorage.getItem(LOCALE_STORAGE_KEY),
          AsyncStorage.getItem(THEME_STORAGE_KEY),
        ]);
        if (cancelled) return;

        // Anything unrecognised - a value written by an older build, say - is
        // treated as "no preference" rather than trusted. A stored `system` is a
        // real choice and is kept; only a missing or unusable value falls back,
        // and it falls back to the device's language rather than to `system`.
        const { preference: nextLocale, wasStored } = resolveLocalePreference(
          storedLocale,
          systemLocale
        );
        const nextTheme = isThemePreference(storedTheme) ? storedTheme : 'system';

        setLocalePreferenceState(nextLocale);
        setThemePreferenceState(nextTheme);
        // Writing the fallback back is what keeps `system` meaningful. Without
        // it, "nothing stored" and "follow the device" would be the same state,
        // and the device's language would be re-read on every launch - so picking
        // `system` would do nothing a plain restart had not already done.
        if (!wasStored) persist(LOCALE_STORAGE_KEY, nextLocale);
        // Applied here rather than from an effect watching this state: the first
        // frame's language and colours both depend on it, and an effect would
        // run only after the tree below has already rendered once.
        apply(nextLocale, nextTheme);
      } catch {
        // An unreadable store leaves the defaults in place - the device's
        // language and the system theme. Nothing here is worth interrupting the
        // user over.
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apply, systemLocale]);

  const setLocalePreference = useCallback(
    (preference: LocalePreference) => {
      setLocalePreferenceState(preference);
      apply(preference, themePreference);
      persist(LOCALE_STORAGE_KEY, preference);
    },
    [apply, themePreference]
  );

  const setThemePreference = useCallback(
    (preference: ThemePreference) => {
      setThemePreferenceState(preference);
      apply(localePreference, preference);
      persist(THEME_STORAGE_KEY, preference);
    },
    [apply, localePreference]
  );

  const value = useMemo<PreferencesState>(
    () => ({
      locale: localePreference === 'system' ? systemLocale : localePreference,
      localePreference,
      setLocalePreference,
      themePreference,
      setThemePreference,
    }),
    [
      localePreference,
      systemLocale,
      setLocalePreference,
      themePreference,
      setThemePreference,
    ]
  );

  // Rendering before storage has been read would show the app in the device's
  // language and colour scheme and then correct itself - the flash this provider
  // exists to prevent.
  if (!isReady) return null;

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/**
 * `app/+html.tsx` hardcodes `<html lang="en">`, and it has to: that file is
 * rendered statically at build time, with no access to the stored preference.
 * Correcting the attribute on the client is the only place left to do it, and it
 * matters for screen readers and hyphenation even though this is an SPA.
 *
 * The full tag (`zh-CN`, not `zh`) is what a language attribute is meant to
 * carry, so it comes from the same map the formatters use.
 */
function applyDocumentLanguage(locale: AppLocale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = toLocaleTag(locale);
}

/**
 * Fire and forget: the preference has already taken effect in memory, so a
 * failed write costs only the next launch.
 */
function persist(key: string, value: string): void {
  void AsyncStorage.setItem(key, value).catch(() => {});
}

export function usePreferences(): PreferencesState {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
