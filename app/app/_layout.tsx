import '@/global.css';

import * as React from 'react';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuthState } from '@/context/auth-context';
import { PreferencesProvider, usePreferences } from '@/context/preferences-context';
import {
  focusManager,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useOnlineManager } from '@/hooks/useOnlineManager';
import { useAppState } from '@/hooks/useAppState';
import { AppStateStatus, Platform, View } from 'react-native';
import { client } from '@/client/client.gen';
import { API_BASE_URL } from '@/lib/api-base';
import { WEB_SHELL_STYLE } from '@/lib/layout';
import axios from 'axios';
import { getRefreshToken, setRefreshToken } from '@/lib/auth-storage';
import { ToastProvider } from '@/components/custom/toast';
import { ApiErrorToaster } from '@/components/custom/api-error-toaster';
import { reportApiError } from '@/lib/api-error';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function RootLayoutNav() {
  const { colorScheme } = useColorScheme();

  const { getAccessToken, setAccessToken, getSessionEpoch, logout, isLoggedIn } = useAuthState();
  const { locale } = usePreferences();

  const queryClient = useQueryClient();

  const activeLocale = React.useRef(locale);

  client.setConfig({
    baseURL: API_BASE_URL,
    headers: {
      // No Authorization here, and it could not be fixed in place. It used to be
      // `Bearer ${tokens?.access_token}`, which sent the literal string
      // "Bearer undefined" whenever there was no token - and under a lazy boot
      // that is every launch's first request. Worse, it cannot be removed once
      // written: setConfig merges into instance.defaults, mergeHeaders skips
      // `undefined` values outright and treats a `null` only as a deletion from
      // the object it is currently building, so a value that reaches
      // instance.defaults.headers survives every later setConfig. axios re-merges
      // those defaults into each request, so a stale access token would still be
      // sent after a logout.
      //
      // The token is attached per request by the request interceptor below, which
      // can also delete it outright.
      //
      // Accept-Language stays: it is what the API reads to decide which language
      // to answer in, and unlike the token it is always a string, so the
      // accumulate-then-overwrite behaviour of setConfig is exactly what we want.
      'Accept-Language': locale,
    },
  });

  React.useEffect(() => {
    // Every response already in the cache was resolved for the *previous*
    // language, and the default five-minute staleTime would keep serving it, so
    // a switch would appear to do nothing on any screen that was already open.
    // Skipped on mount, where the cache holds nothing yet.
    if (activeLocale.current === locale) return;
    activeLocale.current = locale;

    queryClient.invalidateQueries();
  }, [locale, queryClient]);

  const refreshPromise = React.useRef<Promise<string | null> | null>(null);

  const performRefresh = React.useCallback(async (): Promise<string | null> => {
    const epoch = getSessionEpoch();

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await logout();
        return null;
      }

      // Raw axios, NOT client.instance, and the reason is load-bearing: going
      // through the client would attach an access token to a request that must
      // carry the refresh token instead, and a 401 from this endpoint would feed
      // straight back into this very interceptor, recursively.
      const { data } = await axios.get<{ tokens?: { [key: string]: unknown } }>(
        `${API_BASE_URL}/auth/refresh`,
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );

      const accessToken = data?.tokens?.access_token;
      const nextRefreshToken = data?.tokens?.refresh_token;

      if (typeof accessToken !== 'string') {
        await logout();
        return null;
      }

      // The session may have ended while this was in flight - the user pressed
      // Log out, or a login landed. Publishing now would resurrect a token for a
      // session that no longer exists, and with a memory-only access token that
      // means the next request would carry it.
      if (getSessionEpoch() !== epoch) return null;

      // /auth/refresh mints a NEW pair every time, so the newest refresh token
      // replaces the stored one. Nothing server-side invalidates the old one, so
      // this is hygiene rather than a guarantee.
      if (typeof nextRefreshToken === 'string') await setRefreshToken(nextRefreshToken);

      setAccessToken(accessToken);
      return accessToken;
    } catch (error) {
      // ONLY a 401 from the refresh endpoint proves the session is over. A
      // network error or a 500 leaves the refresh token untouched and the user
      // logged in: an offline cold start must not destroy the session, and the
      // next 401 simply starts another attempt.
      if (axios.isAxiosError(error) && error.response?.status === 401) await logout();
      return null;
    }
  }, [getSessionEpoch, logout, setAccessToken]);

  /** Every 401 that lands at the same moment joins the SAME refresh. */
  const ensureFreshAccessToken = React.useCallback((): Promise<string | null> => {
    if (!refreshPromise.current) {
      refreshPromise.current = performRefresh().finally(() => {
        // Cleared in a `finally`, which is the fix for a latch: setting a
        // boolean flag and clearing it only on the paths that returned normally
        // leaves it latched forever after an early `return`, and every later 401
        // is then silently dropped.
        refreshPromise.current = null;
      });
    }

    return refreshPromise.current;
  }, [performRefresh]);

  // The access token is attached here, per request, and cleared when there is
  // none. `config.headers` is already an AxiosHeaders instance by this point
  // (axios concatenates it in Axios.prototype.request), so set/delete exist.
  React.useEffect(() => {
    const id = client.instance.interceptors.request.use((config) => {
      const accessToken = getAccessToken();
      if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
      else config.headers.delete('Authorization');
      return config;
    });

    return () => client.instance.interceptors.request.eject(id);
  }, [getAccessToken]);

  // Registered once, in an effect. Registering it in the render body would
  // append a fresh interceptor on every render - locale changes, colour-scheme
  // changes, and every token change - and could never clean any of them up.
  React.useEffect(() => {
    const id = client.instance.interceptors.response.use(undefined, async (error) => {
      const originalRequest = error.config;

      if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
        return Promise.reject(error);
      }

      originalRequest._retry = true; // set BEFORE the await, so a re-401 cannot loop

      const accessToken = await ensureFreshAccessToken();
      if (!accessToken) {
        // Reject with the ORIGINAL error. Returning from an error interceptor
        // RESOLVES it, which would hand the caller a success it never got.
        return Promise.reject(error);
      }

      // No manual header write: the retry passes back through the request
      // interceptor, which reads the ref that setAccessToken just updated.
      return client.instance(originalRequest);
    });

    return () => client.instance.interceptors.response.eject(id);
  }, [ensureFreshAccessToken]);

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* A centred, width-capped column on web; a plain full-screen view on
          native. Everything - screens and the tab bar - lives inside it, so no
          screen has to cap itself. Portals stay outside it (see PortalHost
          below) so a dialog's scrim still covers the whole window. */}
      <View className="flex-1" style={WEB_SHELL_STYLE}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Public Auth Routes */}
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />

          {/* Protected Tabs Route */}
          <Stack.Protected guard={isLoggedIn}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
        </Stack>
      </View>
      <PortalHost />
    </ThemeProvider>
  );
}

function onAppStateChange(status: AppStateStatus) {
  // React Query already supports in web browser refetch on window focus by default
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export default function RootLayout() {
  useOnlineManager();

  useAppState(onAppStateChange);

  const queryClient = new QueryClient({
    // Every failed write is announced here, in one place, instead of each screen
    // deciding how to report it. That mix used to be a problem in its own right:
    // most places called `Alert.alert`, which react-native-web stubs out to a
    // no-op, so a web user's failed write said nothing at all.
    mutationCache: new MutationCache({
      onError: (error) => {
        reportApiError(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes
      },
    },
  });

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* Above AuthProvider: the stored language has to be applied before
            anything renders, or the first frame comes up in the wrong one. */}
        <PreferencesProvider>
          <AuthProvider>
            {/* Inside every provider the screens use, so a toast raised while a
                screen is mounting still has its safe-area insets. */}
            <ToastProvider>
              <RootLayoutNav />
              <ApiErrorToaster />
            </ToastProvider>
          </AuthProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
