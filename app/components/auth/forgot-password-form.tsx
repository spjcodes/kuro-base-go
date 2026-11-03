import { Button } from '@/components/ui/button';
import { IconInput } from './icon-input';
import { AuthCard } from './auth-card';
import { MailIcon } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { useState } from 'react';
import { ResetPasswordSuccess } from './reset-password-success';
import { useTranslation } from '@/lib/i18n';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleReset = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      // The base API has no password-reset endpoint yet, so the screen shows its
      // sent state without asking anyone. Replace this with the request when the
      // endpoint exists - the shape of the form does not have to change.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return <ResetPasswordSuccess email={email} onBack={() => router.back()} />;
  }

  return (
    <AuthCard title={t('auth.resetPasswordTitle')}>
      <IconInput
        label={t('auth.email')}
        icon={MailIcon}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        className="mt-2 w-full shadow-md"
        size="lg"
        onPress={handleReset}
        disabled={isLoading || !email}>
        <Text className="font-bold">{isLoading ? t('auth.sending') : t('auth.sendResetLink')}</Text>
      </Button>

      <View className="flex-row items-center justify-center gap-2 pt-4">
        <Text variant="muted">{t('auth.rememberPassword')}</Text>
        <Link href="/sign-in" asChild>
          <Text variant="small" className="font-semibold text-primary">
            {t('auth.signIn')}
          </Text>
        </Link>
      </View>
    </AuthCard>
  );
}
