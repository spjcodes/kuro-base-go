import { Platform, type ViewStyle } from 'react-native';

/**
 * How wide the app is allowed to grow on web.
 *
 * The app is designed for a phone, and a browser window is not one. Left alone,
 * every screen stretches to the full window, which reads as a broken layout on a
 * desktop browser. Capping the shell and centring it keeps every screen at a
 * comfortable width without changing anything on native, where the window is
 * already this small.
 */
export const CONTENT_MAX_WIDTH = 1152;

/**
 * Applied to the root view on web only. `width` plus `maxWidth` keeps the shell
 * full-bleed while the window is narrow, and `alignSelf` centres it once it is
 * not. On native this style is absent, so the existing layout is untouched.
 */
export const WEB_SHELL_STYLE: ViewStyle | undefined = Platform.select<ViewStyle | undefined>({
  web: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  default: undefined,
});

/**
 * Sign-in and register are a single form, so they get a form's width. Without
 * this the card fills the 1152px shell and the two inputs become 1000px-wide
 * bars with a label pinned to the far left. Web only, so the native form is
 * byte-for-byte unchanged.
 */
export const AUTH_CARD_STYLE: ViewStyle | undefined = Platform.select<ViewStyle | undefined>({
  web: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  default: undefined,
});
