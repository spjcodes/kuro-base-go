import { AuthHeader, AuthLayout, SignInForm } from '@/components/auth';
import { useTranslation } from '@/lib/i18n';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <AuthLayout>
      <AuthHeader title={t('auth.signInTitle')} subtitle={t('auth.signInSubtitle')} />
      <SignInForm />
    </AuthLayout>
  );
}
