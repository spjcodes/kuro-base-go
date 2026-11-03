// Single source of truth for the backend origin.
//
// Nothing else may hardcode one: the URL is resolved here once, the API client
// is configured from this value (app/_layout.tsx), and the refresh call that
// bypasses that client uses it too.
//
// Development resolves the host automatically, because the machine's address
// depends on where the app runs:
//
//   - web:            the browser is on this machine, so localhost is correct
//   - physical phone: localhost is the phone; it needs this machine's LAN address
//   - Android emu:    the host machine is reached through 10.0.2.2
//
// Metro already knows how the device reached this machine, so its host is the
// most reliable source. EXPO_PUBLIC_API_URL still wins when it names a real
// host (a deployed API, a tunnel, a fixed address); a loopback value is only
// honoured on web, where it actually means "this machine".
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8080;

const LOOPBACK_URL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function devBaseURL(): string {
  // `hostUri` is "192.168.0.5:8081" under `expo start --lan`, or "localhost:8081"
  // when Metro is reached through `adb reverse` (emulator) or a tunnel.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];

  if (host && !LOOPBACK_HOSTS.has(host)) {
    // The API is assumed to run beside Metro, on the same machine.
    return `http://${host}:${API_PORT}`;
  }

  // No usable LAN address, so use the emulator's alias for the host machine.
  // iOS simulators share the host's loopback.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : `http://localhost:${API_PORT}`;
}

const configured = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

export const API_BASE_URL =
  configured && !(Platform.OS !== 'web' && LOOPBACK_URL.test(configured))
    ? configured
    : Platform.OS === 'web'
      ? configured || `http://localhost:${API_PORT}`
      : devBaseURL();
