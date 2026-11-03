import { Button } from '@/components/ui/button';
import { IconInput } from './icon-input';
import { PasswordInput } from './password-input';
import { AuthCard } from './auth-card';
import { AuthFooter } from './auth-footer';
import { MailIcon, UserIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthState } from '@/context/auth-context';
import { z } from 'zod';
import { zHandlersRegisterPayload } from '@/client/zod.gen';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { postAuthRegisterMutation } from '@/client/@tanstack/react-query.gen';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { reportApiError } from '@/lib/api-error';
import type { TFunction } from 'i18next';

/**
 * Built per language rather than once at module scope: these two messages are
 * the only validation copy the generated schema does not supply, so they have to
 * follow the active locale like every other string. (The generated schema's own
 * messages come from the zod locale pack installed by the preferences provider.)
 */
const makeRegisterSchema = (t: TFunction) =>
  zHandlersRegisterPayload
    .extend({
      confirmPassword: z.string().min(8, t('auth.passwordMinLength')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    });

export function RegisterForm() {
  const { t } = useTranslation();
  const { mutateAsync: registerMutation, isPending } = useMutation(postAuthRegisterMutation());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login } = useAuthState();
  const router = useRouter();

  const schema = useMemo(() => makeRegisterSchema(t), [t]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const response = await registerMutation({
        body: {
          name: data.name,
          email: data.email,
          password: data.password,
        },
      });

      await login(response);

      router.replace('/(tabs)/(home)');
    } catch (error) {
      // Reported once by the mutation cache; this keeps the awaited rejection
      // from going unhandled and covers failures that never reached the API.
      reportApiError(error);
    }
  };

  return (
    <AuthCard title={t('auth.signUp')}>
      <Controller
        name="name"
        control={form.control}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <IconInput
              label={t('auth.fullName')}
              icon={UserIcon}
              placeholder={t('auth.fullNamePlaceholder')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
            />
            {error && <Text className="mt-1 text-sm text-destructive">{error.message}</Text>}
          </View>
        )}
      />

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
              placeholder={t('auth.createPasswordPlaceholder')}
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

      <Controller
        name="confirmPassword"
        control={form.control}
        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
          <View>
            <PasswordInput
              label={t('auth.confirmPassword')}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              showPassword={showConfirmPassword}
              onToggleShowPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            />
            {error && <Text className="mt-1 text-sm text-destructive">{error.message}</Text>}
          </View>
        )}
      />

      <Button
        className="mt-2 w-full shadow-md"
        size="lg"
        onPress={form.handleSubmit(onSubmit)}
        disabled={isPending}>
        <Text className="font-bold">{isPending ? t('auth.signUpPending') : t('auth.signUp')}</Text>
      </Button>

      <AuthFooter
        question={t('auth.haveAccount')}
        linkText={t('auth.signIn')}
        linkHref="/sign-in"
      />
    </AuthCard>
  );
}
