import { DarkModeToggle } from '@/components/custom/dark-mode-toggle';
import { LanguageSwitcher } from '@/components/custom/language-switcher';
import { ProfileHeader } from '@/components/custom/profile-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { LogOutIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthState } from '@/context/auth-context';
import { useTranslation } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { getUserOptions } from '@/client/@tanstack/react-query.gen';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAuthState();

  // The protected read: it shows the profile the API holds, not the copy
  // AsyncStorage kept from login, and it is what exercises the Authorization
  // header and the refresh-token rotation on a cold start. The cached user is
  // the fallback, so the header never comes up empty while the call is in
  // flight.
  const { data: profile } = useQuery(getUserOptions());
  const current = profile?.data ?? user;

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/sign-in');
    } catch {
      // `logout` converges in its own `finally`, so the session is already gone
      // even when it throws (a keychain delete failed, say). The only thing left
      // to do here is take the user to the sign-in screen.
      router.replace('/sign-in');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-6">
        <Text variant="h2" className="mb-2 border-none text-2xl font-bold">
          {t('profile.title')}
        </Text>
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-4 pt-6">
          <ProfileHeader
            name={current?.name || t('profile.defaultUserName')}
            email={current?.email || t('profile.noEmail')}
          />

          <LanguageSwitcher />
          <DarkModeToggle />
        </View>
      </ScrollView>

      {/* Logout */}
      <View className="px-5 pb-4 pt-6">
        <Button variant="destructive" className="w-full shadow-md" size="lg" onPress={handleLogout}>
          <Icon as={LogOutIcon} size={20} color="white" />
          <Text className="font-bold">{t('profile.logOut')}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
