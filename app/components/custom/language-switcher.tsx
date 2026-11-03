import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { usePreferences } from '@/context/preferences-context';
import {
  APP_LOCALES,
  isLocalePreference,
  useTranslation,
  type AppLocale,
  type LocalePreference,
} from '@/lib/i18n';
import { LanguagesIcon } from 'lucide-react-native';
import { View } from 'react-native';

/**
 * A language is named in its own language. Someone who reads only Japanese has
 * to be able to find 日本語 on this list, so translating these labels into the
 * language that is currently active would defeat the point - the names are data,
 * not copy.
 */
const LANGUAGE_ENDONYMS: Record<AppLocale, string> = {
  zh: '简体中文',
  en: 'English',
  ja: '日本語',
};

/**
 * A dropdown in place of the inline rows this used to be: the card keeps its
 * height as languages are added, and the trigger names the current choice where
 * the rows could only imply it by highlighting one of themselves.
 *
 * The control opens on a concrete language, never on `system` - the preferences
 * provider stores the device's language the first time, and only a deliberate
 * pick of `system` puts the app back on following the device.
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { localePreference, setLocalePreference } = usePreferences();

  const options: { value: LocalePreference; label: string }[] = [
    // The one label here that is a UI phrase rather than a language name, so it
    // is the one that gets translated.
    { value: 'system', label: t('profile.languageSystem') },
    ...APP_LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_ENDONYMS[locale] })),
  ];

  // The provider only ever holds a value from this list, so the fallback is
  // unreachable; it is here to satisfy the primitive's `Option | undefined`.
  const selected = options.find((option) => option.value === localePreference) ?? options[0];

  return (
    <Card className="mb-6 overflow-hidden shadow-md shadow-black/5 dark:shadow-black/20">
      <CardContent className="p-4">
        <View className="flex-row items-center">
          <View className="mr-4 rounded-lg bg-muted/30 p-2">
            <Icon as={LanguagesIcon} size={22} className="text-emerald-500" />
          </View>
          {/* No subtitle, unlike the dark mode card below it: there the second
              line is the state, and here the trigger already states it. */}
          <Text className="flex-1 text-left text-base font-medium">
            {t('profile.language')}
          </Text>
        </View>

        <Select
          value={selected}
          onValueChange={(option) => {
            // The primitive hands back whatever string the item carried, so the
            // value is validated rather than cast - the same rule the stored
            // preference is held to.
            const next = option?.value;
            if (isLocalePreference(next)) setLocalePreference(next);
          }}>
          <SelectTrigger className="mt-3 w-full" aria-label={t('profile.language')}>
            {/* The primitive requires a placeholder but only falls back to it
                when the value is empty, which it never is here: `selected` is
                built from this same list, so the trigger always has a label. */}
            <SelectValue placeholder={t('profile.language')} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} label={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
