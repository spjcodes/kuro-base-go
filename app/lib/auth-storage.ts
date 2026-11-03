import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the refresh token lives.
 *
 * On iOS and Android this is the platform keystore - the Keychain and the
 * Android Keystore - rather than AsyncStorage, which is a plaintext file inside
 * the app sandbox on iOS and a plaintext XML file under `shared_prefs` on
 * Android, and is swept up by device backups. The refresh token is the one
 * credential worth that difference: it is good for 24 hours, and this API has no
 * way to revoke it (see `logout` in context/auth-context.tsx).
 *
 * The access token is deliberately NOT stored anywhere - it lives in memory for
 * its 15 minutes. See AuthState.getAccessToken.
 */

/**
 * Keychain-safe name. SecureStore accepts only `/^[\w.-]+$/`, which is why a
 * name like `@token_user` cannot be used: the "@" makes the call throw before it
 * ever reaches the keychain. The web fallback uses the same string so there is
 * only one key to reason about.
 */
export const REFRESH_TOKEN_STORAGE_KEY = 'auth.refresh_token';

/**
 * iOS only, and the point of it: kSecAttrAccessibleWhenUnlockedThisDeviceOnly.
 *
 * "ThisDeviceOnly" keeps the item out of iCloud and iTunes backups, so restoring
 * a backup onto another device does not hand it a live session. "WhenUnlocked"
 * means the keychain will not release it while the device is locked - a read at
 * that moment rejects, which the boot check absorbs rather than treating as a
 * missing token.
 *
 * Passed to all three calls rather than just the write: one object cannot drift,
 * and iOS matches the delete/read query against the attribute it was written
 * with. Deliberately no `requireAuthentication` (it would turn every read into a
 * biometric prompt) and no `keychainService`.
 */
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * The web half.
 *
 * This is the status quo, not a fix: localStorage is readable by any script on
 * the page, so an XSS still walks away with the refresh token. The real answer
 * is a server-issued httpOnly cookie plus `withCredentials`, which is a backend
 * change and out of scope here.
 */
function webStorage(): Storage | null {
  // Guarded rather than assumed: app.json sets web.output = "static", so every
  // route is prerendered in Node. Nothing calls this during prerender today -
  // PreferencesProvider returns null until it hydrates, so AuthProvider never
  // mounts there - but a module that throws "localStorage is not defined" the
  // day someone lifts AuthProvider above it is not worth two lines of risk.
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // getItem returns null for a missing key, which is the native contract too.
    return webStorage()?.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? null;
  }

  return SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY, SECURE_STORE_OPTIONS);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    // A throw propagates on purpose (quota exceeded, Safari private mode), to
    // match `login`, which throws and lets the sign-in form report the failure.
    webStorage()?.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    return;
  }

  // The raw token, never JSON: setItemAsync takes a string and rejects anything
  // else. These JWTs are well under the 2048-byte limit.
  await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, token, SECURE_STORE_OPTIONS);
}

export async function deleteRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    // Best effort, swallowing errors, so that logging out can never be blocked
    // by storage. removeItem is already a no-op for an absent key.
    try {
      webStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // Nothing useful to do: the key is gone from the app's point of view
      // either way, and the caller is on its way to the sign-in screen.
    }
    return;
  }

  // Likewise resolves when there is nothing to delete.
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY, SECURE_STORE_OPTIONS);
}
