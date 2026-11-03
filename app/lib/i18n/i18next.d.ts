import 'i18next';

import type { en } from './locales/en';

/**
 * Teaches `t()` the shape of the catalogs, so that a key is completed rather
 * than guessed and a wrong one fails the build instead of rendering as
 * `profile.logOut` in the middle of the screen.
 *
 * The shape comes from the reference catalog; zh.ts and ja.ts are separately
 * checked against it, which is what makes a half-translated locale impossible to
 * ship.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
    returnNull: false;
  }
}
