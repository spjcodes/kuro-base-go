// app/(tabs)/profile/_layout.tsx
// A stack rather than a single screen: sub-pages of the profile (settings,
// account, ...) are pushed on top of the profile tab instead of becoming tabs of
// their own.
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
