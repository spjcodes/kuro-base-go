import { AuthHeader, AuthLayout, RegisterForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';

export default function RegisterScreen() {
  const { t } = useTranslation();

  return (
    <AuthLayout>
      <AuthHeader title={t('auth.signUpTitle')} subtitle={t('auth.signUpSubtitle')} />
      <RegisterForm />
    </AuthLayout>
  );
}
