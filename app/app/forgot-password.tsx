import { AuthHeader, AuthLayout, ForgotPasswordForm } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ArrowLeftIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <AuthLayout>
      <Button variant="ghost" size="icon" className="mb-4 h-10 w-10" onPress={() => router.back()}>
        <Icon as={ArrowLeftIcon} size={20} />
      </Button>

      <AuthHeader title={t('auth.forgotPassword')} subtitle={t('auth.forgotPasswordSubtitle')} />

      <ForgotPasswordForm />
    </AuthLayout>
  );
}
