import type { AppLocale } from '@/lib/i18n';

/**
 * Full BCP 47 tags rather than the bare `zh`/`en`/`ja` the app stores: the region
 * is what pins the conventions, and a language attribute on the web is meant to
 * carry the full tag (`zh-CN`, not `zh`).
 */
const LOCALE_TAGS: Record<AppLocale, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
};

export function toLocaleTag(locale: AppLocale): string {
  return LOCALE_TAGS[locale];
}

/**
 * Renders a timestamp for the reader's language: `Mar 5, 2024` in English,
 * `2024年3月5日` in Chinese and Japanese.
 *
 * Returns `null` for a missing or unparseable value so the caller can show its
 * own placeholder from the catalog - this module deliberately contains no
 * user-visible copy, so that every word on screen still goes through `t()`.
 */
export function formatDate(
  value: string | number | Date | null | undefined,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string | null {
  if (value === null || value === undefined || value === '') return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return new Intl.DateTimeFormat(toLocaleTag(locale), options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
