import { Redirect } from 'expo-router';
import { useAuthState } from '@/context/auth-context';
import { Loading } from '@/components/custom/loading';
import { useTranslation } from '@/lib/i18n';

export default function Index() {
  const { isLoggedIn, isLoading } = useAuthState();
  const { t } = useTranslation();

  if (isLoading) {
    return <Loading message={t('common.loading')} />;
  }

  if (isLoggedIn) {
    return <Redirect href="/(tabs)/(home)" />;
  }

  return <Redirect href="/sign-in" />;
}
