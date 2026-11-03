import { Button } from '@/components/ui/button';
import { IconInput } from './icon-input';
import { PasswordInput } from './password-input';
import { AuthCard } from './auth-card';
import { AuthFooter } from './auth-footer';
import { MailIcon } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from 'react-native';
import { useState } from 'react';
import { useAuthState } from '@/context/auth-context';
import { zHandlersLoginPayload } from '@/client/zod.gen';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { HandlersLoginPayload } from '@/client/types.gen';
import { postAuthLoginMutation } from '@/client/@tanstack/react-query.gen';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { reportApiError } from '@/lib/api-error';

export function SignInForm() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync: loginMutation, isPending } = useMutation(postAuthLoginMutation());

  const { login } = useAuthState();
  const router = useRouter();

  const form = useForm<HandlersLoginPayload>({
    resolver: zodResolver(zHandlersLoginPayload),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: HandlersLoginPayload) => {
    try {
      const response = await loginMutation({
        body: {
          email: data.email,
          password: data.password,
        },
      });

      await login(response);
      router.replace('/(tabs)/(home)');
    } catch (error) {
      // The failure is already on screen: the mutation cache reported it to the
      // toast. This catch exists so an awaited rejection does not surface as an
      // unhandled promise - `reportApiError` dedupes, so it adds nothing when the
      // mutation already reported, and covers the local failures (a keychain
      // write, a missing token) that never reached the API.
      reportApiError(error);
    }
  };

  return (
    <AuthCard title={t('auth.signIn')}>
      <Controller
        name="email"
        control={form.control}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <IconInput
              label={t('auth.email')}
              icon={MailIcon}
              placeholder={t('auth.emailPlaceholder')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error && <Text className="mt-1 text-sm text-destructive">{error.message}</Text>}
          </View>
        )}
      />

      <Controller
        name="password"
        control={form.control}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <PasswordInput
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
            />
            {error && <Text className="mt-1 text-sm text-destructive">{error.message}</Text>}
          </View>
        )}
      />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          {/* Checkbox would go here if needed */}
        </View>
        <Link href="/forgot-password" asChild>
          <Text variant="small" className="text-primary">
            {t('auth.forgotPassword')}
          </Text>
        </Link>
      </View>

      <Button
        className="mt-2 w-full shadow-md"
        size="lg"
        onPress={form.handleSubmit(onSubmit)}
        disabled={isPending}>
        <Text className="font-bold">{isPending ? t('auth.signInPending') : t('auth.signIn')}</Text>
      </Button>

      <AuthFooter question={t('auth.noAccount')} linkText={t('auth.signUp')} linkHref="/register" />
    </AuthCard>
  );
}
