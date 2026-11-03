import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ModelsUserView, ModelsLoginResponse } from '@/client/types.gen';
import { deleteRefreshToken, getRefreshToken, setRefreshToken } from '@/lib/auth-storage';

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: ModelsUserView | null;
  login: (response: ModelsLoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * The access token, memory-only. A ref rather than React state, deliberately:
   * nothing renders from it (the only reader is the HTTP layer in app/_layout),
   * so state would buy nothing but a re-render on every 15-minute refresh, and a
   * ref has no window where the HTTP layer could read a stale value.
   *
   * The consequence to know about: a component that wants to *render* from the
   * access token (a "session expires in..." line, say) has to lift it back into
   * state first.
   */
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  /**
   * Bumped on every login and logout. A refresh already in flight belongs to the
   * session that started it, so it compares this before publishing a token into
   * a session that may have ended or changed hands in the meantime.
   */
  getSessionEpoch: () => number;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Nothing writes this key any more - the refresh token lives in the keychain
 * (lib/auth-storage.ts) and the access token is memory-only. That is exactly
 * what makes its *presence* a reliable marker of an install from before the
 * change, which is what checkAuthState uses it for.
 */
const LEGACY_TOKEN_STORAGE_KEY = '@token_user';
const USER_STORAGE_KEY = '@user_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<ModelsUserView | null>(null);

  const accessTokenRef = useRef<string | null>(null);
  const sessionEpochRef = useRef(0);

  const queryClient = useQueryClient();

  // Both getters and the setter are referentially stable, so they are safe as
  // interceptor effect dependencies in app/_layout.tsx.
  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
  }, []);

  const getSessionEpoch = useCallback(() => sessionEpochRef.current, []);

  const logout = useCallback(async () => {
    // Client-side only, and that is not an oversight: the API has no logout
    // endpoint - its only auth routes are POST /auth/login, POST /auth/register
    // and GET /auth/refresh. The refresh token is a stateless JWT validated by
    // signature and expiry alone, so the server goes on honouring it until it
    // expires, up to 24 hours later. Server-side revocation is the only real fix
    // and is out of scope here.
    sessionEpochRef.current += 1;

    try {
      await deleteRefreshToken();
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      // In a `finally` so that logout always converges. A storage failure must
      // not strand the app half logged out, with no way back.
      setAccessToken(null);
      setUser(null);
      setIsLoggedIn(false);
      // The next account to log in on this device must not inherit the previous
      // one's cached data.
      queryClient.clear();
    }
  }, [queryClient, setAccessToken]);

  const checkAuthState = useCallback(async () => {
    try {
      // Legacy installs kept BOTH tokens in AsyncStorage under `@token_user`, in
      // plaintext. There is no migration, on purpose: the whole point of this
      // change is that the plaintext copy stops existing, and a migration would
      // mean trusting it one more time. An install that only has that key is
      // treated as logged out.
      //
      // Its own try/catch: this is bookkeeping, and a bookkeeping failure must
      // not stop a perfectly good session from being restored below.
      let wasLegacyInstall = false;
      try {
        wasLegacyInstall = (await AsyncStorage.getItem(LEGACY_TOKEN_STORAGE_KEY)) !== null;
        if (wasLegacyInstall) {
          // Idempotent by contract: removeItem resolves when the key is absent,
          // so this runs harmlessly on every later launch and after any partial
          // failure. The read above exists to learn whether this IS a legacy
          // install, not to protect the delete.
          await AsyncStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error clearing the legacy token key:', error);
      }

      const refreshToken = await getRefreshToken();

      if (refreshToken === null) {
        // Nothing to restore. A legacy install has just been demoted to exactly
        // this state, so drop the profile with it - it is the previous account's
        // name and email, and nothing will read it before the next login.
        //
        // Keep this invariant: a session is restored only when a refresh token is
        // present, never from the profile alone. Restoring a profile that has no
        // refresh token behind it would recreate the "logged in but unable to
        // refresh" state this whole change exists to prevent.
        if (wasLegacyInstall) await AsyncStorage.removeItem(USER_STORAGE_KEY);
        return;
      }

      // LAZY BOOT. The presence of a refresh token is taken as the session, and
      // nothing else: no /auth/refresh here, and no access token in memory. The
      // first authed request will 401 and the response interceptor in
      // app/_layout.tsx mints one from the refresh token. Boot costs one keychain
      // read instead of a network round-trip, and a cold start on a dead network
      // still shows the app.
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      let parsedUser: ModelsUserView | null = null;
      if (userData) {
        try {
          parsedUser = JSON.parse(userData) as ModelsUserView;
        } catch {
          // A corrupt profile must not cost the user their session. The screens
          // already tolerate an unknown user.
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      }

      setUser(parsedUser);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in on app start
    checkAuthState();
  }, [checkAuthState]);

  const login = useCallback(
    async (response: ModelsLoginResponse) => {
      // `ModelsLoginResponse['tokens']` is `{ [key: string]: unknown }`, so this
      // is the only place the response becomes the two strings the app needs.
      // Typed rather than cast: with a lazy boot, `isLoggedIn` is derived from
      // the mere PRESENCE of a stored refresh token, so writing the string
      // "undefined" into the keychain would manufacture a session that can never
      // be refreshed - and it would not surface until the next cold start.
      const accessToken = response.tokens?.access_token;
      const refreshToken = response.tokens?.refresh_token;

      if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
        throw new Error('Login response is missing tokens');
      }

      // Profile first, then the token. If the profile write fails, nothing is
      // stored and the caller's catch reports a failed login; if the token write
      // fails, the leftover profile is harmless, because checkAuthState never
      // restores a session without a refresh token.
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      await setRefreshToken(refreshToken);

      sessionEpochRef.current += 1;

      setAccessToken(accessToken); // memory only, never persisted
      setUser(response.user as ModelsUserView);
      setIsLoggedIn(true);
    },
    [setAccessToken]
  );

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        user,
        login,
        logout,
        getAccessToken,
        setAccessToken,
        getSessionEpoch,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
}
