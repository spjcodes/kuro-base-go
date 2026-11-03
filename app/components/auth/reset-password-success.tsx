import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MailIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from '@/lib/i18n';

interface ResetPasswordSuccessProps {
  email: string;
  onBack: () => void;
}

export function ResetPasswordSuccess({ email, onBack }: ResetPasswordSuccessProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/30">
      <CardHeader className="pb-6">
        <View className="mb-4 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Icon as={MailIcon} size={40} className="text-primary" />
          </View>
        </View>
        <Text variant="h3" className="text-center text-2xl font-bold">
          {t('auth.checkYourEmail')}
        </Text>
      </CardHeader>
      <CardContent className="gap-4">
        <Text variant="muted" className="text-center text-base">
          {t('auth.resetLinkSent', { email })}
        </Text>
        <Button className="mt-4 w-full shadow-md" size="lg" onPress={onBack}>
          <Text className="font-bold">{t('auth.backToSignIn')}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

