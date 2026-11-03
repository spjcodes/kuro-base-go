import axios from 'axios';
import i18next from '@/lib/i18n';

/**
 * Turns an unknown thrown value into a message worth showing a user.
 *
 * Prefers the server's own `message` field, which the API always sets on an
 * error response, and falls back to something generic rather than leaking an
 * axios internals string into the UI.
 *
 * The fallbacks go through i18next's instance rather than a hook because this is
 * called from event handlers and mutation callbacks, not during render. The
 * server's own message wins where there is one, and the API translates that
 * itself from the Accept-Language header the same requests carry.
 *
 * `!error.response` is checked before the statuses on purpose: axios rejects a
 * request that never reached the server (offline, backend down, timeout) with no
 * response at all, and `error.message` for that is the string "Network Error" -
 * which would otherwise be shown verbatim, in English, whatever the app's
 * language was.
 */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;

    if (!error.response) return i18next.t('errors.network');

    const status = error.response.status;
    if (status === 403) return i18next.t('errors.forbidden');
    if (status === 401) return i18next.t('errors.sessionExpired');
    if (status >= 500) return i18next.t('errors.server');
  }
  return i18next.t('errors.generic');
}

type ApiErrorListener = (message: string) => void;

const listeners = new Set<ApiErrorListener>();

/**
 * The same failure arrives here more than once. React Query's cache-level
 * handler reports a failed mutation, and the caller's own `catch` reports it a
 * second time - that catch exists to stop the rejection going unhandled, not to
 * decide what the user sees. A screen retrying three times can repeat it again.
 * So identical messages inside this window collapse into one.
 */
const REPEAT_WINDOW_MS = 4000;
let lastReport: { message: string; at: number } | null = null;

/**
 * Subscribes the UI that draws errors; returns the unsubscribe function.
 *
 * A plain listener set rather than React context because the reporter is called
 * from the MutationCache, which is created before (and outside) any provider
 * that could carry a callback.
 */
export function subscribeApiErrors(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reports an API failure to the toast UI, once.
 *
 * Call it from any catch that has nothing better to do with the error. A screen
 * with a specific message of its own should keep showing that instead.
 */
export function reportApiError(error: unknown): void {
  const message = apiErrorMessage(error);
  const now = Date.now();

  if (lastReport && lastReport.message === message && now - lastReport.at < REPEAT_WINDOW_MS) {
    return;
  }
  lastReport = { message, at: now };

  // console.log, not console.error: in development console.error raises the
  // LogBox overlay, which is the unhelpful "expo popup" this reporting exists to
  // replace. The error still reaches the Metro console for debugging.
  if (__DEV__) console.log('[api-error]', error);

  for (const listener of listeners) listener(message);
}
