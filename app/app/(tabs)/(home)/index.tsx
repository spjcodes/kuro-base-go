import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthState } from '@/context/auth-context';
import { useTranslation } from '@/lib/i18n';
import { CheckIcon, RefreshCwIcon } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getPingOptions } from '@/client/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuthState();

  // A real request through the generated client, so this screen shows whether
  // the API is reachable rather than merely whether the app bundled.
  const {
    data: ping,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    ...getPingOptions(),
    // /ping is a liveness check, not data: it is worth asking every time this
    // screen is opened, including when it is reopened.
    staleTime: 0,
  });

  const online = !isPending && !isError && ping !== undefined;

  const included = [
    t('home.includedAuth'),
    t('home.includedI18n'),
    t('home.includedTheme'),
    t('home.includedErrors'),
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pt-4">
        <Text variant="h1" className="mb-1 text-left text-3xl font-bold">
          {t('home.title')}
        </Text>
        <Text variant="muted" className="text-base">
          {t('home.subtitle')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pb-4 pt-6" showsVerticalScrollIndicator={false}>
        <Card className="mb-6 overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/30">
          <CardHeader className="pb-2">
            <Text variant="muted" className="text-sm">
              {t('home.welcome', { name: user?.name ?? t('profile.defaultUserName') })}
            </Text>
          </CardHeader>
          <CardContent>
            <Text className="text-base font-medium">{user?.email}</Text>
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden shadow-md shadow-black/5 dark:shadow-black/20">
          <CardContent className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium">{t('home.statusTitle')}</Text>
              <View className="flex-row items-center gap-2">
                <View
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isPending ? 'bg-muted-foreground' : online ? 'bg-emerald-500' : 'bg-destructive'
                  )}
                />
                <Text variant="muted" className="text-sm">
                  {isPending ? t('home.statusChecking') : online ? t('home.statusOk') : t('home.statusFailed')}
                </Text>
              </View>
            </View>
            <Text variant="muted" className="text-xs">
              {t('home.statusHint')}
            </Text>
            {/* A failed query is also reported to the toast by the cache-level
                handler only for mutations, so this screen states the failure
                itself and offers the retry. */}
            {isError && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onPress={() => refetch()}
                disabled={isFetching}>
                <Icon as={RefreshCwIcon} size={16} />
                <Text>{t('common.retry')}</Text>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 overflow-hidden shadow-md shadow-black/5 dark:shadow-black/20">
          <CardHeader className="pb-2">
            <Text className="text-base font-medium">{t('home.includedTitle')}</Text>
          </CardHeader>
          <CardContent className="gap-3">
            {included.map((line) => (
              <View key={line} className="flex-row items-start gap-3">
                <Icon as={CheckIcon} size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                <Text className="flex-1 text-sm leading-5">{line}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
