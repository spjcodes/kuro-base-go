// Single source of truth for the backend origin.
//
// Nothing else may hardcode one: EXPO_PUBLIC_API_URL is read here once, the API
// client is configured from this value (app/_layout.tsx), and the refresh call
// that bypasses that client uses it too.
//
// On a physical device `localhost` is the phone, not this machine - point the
// variable at the machine's LAN address there.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  ''
);
