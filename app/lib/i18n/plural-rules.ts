type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

interface PluralRulesLike {
  select(value: number): PluralCategory;
  resolvedOptions(): { locale: string; pluralCategories: PluralCategory[] };
}

/**
 * Cardinal categories per language, per CLDR. Chinese and Japanese have only
 * `other` - the number never changes the noun, so there is no singular form for
 * them to select.
 */
const PLURAL_CATEGORIES: Record<string, PluralCategory[]> = {
  en: ['one', 'other'],
  zh: ['other'],
  ja: ['other'],
};

const UNKNOWN_LANGUAGE_CATEGORIES: PluralCategory[] = ['other'];

class CardinalPluralRules implements PluralRulesLike {
  private readonly categories: PluralCategory[];
  private readonly locale: string;

  constructor(locale?: string) {
    const tag = locale ?? 'en';
    this.locale = tag;
    // Covers `zh-CN`, `ja-JP` and friends: the language subtag is what decides
    // the categories.
    const language = tag.toLowerCase().split(/[-_]/)[0];
    this.categories = PLURAL_CATEGORIES[language] ?? UNKNOWN_LANGUAGE_CATEGORIES;
  }

  select(value: number): PluralCategory {
    if (this.categories.length > 1 && Number(value) === 1) return 'one';
    return 'other';
  }

  resolvedOptions(): { locale: string; pluralCategories: PluralCategory[] } {
    return { locale: this.locale, pluralCategories: [...this.categories] };
  }
}

/**
 * Restores `Intl.PluralRules` on a runtime that lacks it.
 *
 * Hermes is such a runtime, and this is not a guess: its Intl surface is
 * `Collator`, `DateTimeFormat` and `NumberFormat` only - there is no
 * `PluralRules` anywhere in the engine. i18next resolves plural suffixes
 * *exclusively* through `Intl.PluralRules`, and when that is missing it falls
 * back to a dummy rule that claims every language has both a `one` and an
 * `other` category. That is wrong for Chinese and Japanese: it sends them
 * looking for `_one` keys that do not exist, and a lookup that finds nothing
 * renders the raw key on screen.
 *
 * A full Intl polyfill would outweigh the rest of this app's own code, and
 * three languages' cardinal rules are a dozen lines. Stands down when a real
 * implementation is present, so the browser build uses the platform's.
 *
 * Adding a fourth language means adding it to PLURAL_CATEGORIES above.
 */
export function installPluralRules(): void {
  if (typeof Intl === 'undefined') return;

  const intl = Intl as unknown as { PluralRules?: unknown };
  if (intl.PluralRules !== undefined) return;

  intl.PluralRules = CardinalPluralRules;
}
