import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/lib/i18n';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('common.notFoundTitle') }} />
      <View>
        <Text>{t('common.notFoundMessage')}</Text>

        <Link href="/">
          <Text>{t('common.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}
