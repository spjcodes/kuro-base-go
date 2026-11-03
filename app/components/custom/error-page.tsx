import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/lib/i18n';
import { View } from 'react-native';
import { AlertTriangleIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ErrorPageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showBackButton?: boolean;
  showRetryButton?: boolean;
  retryLabel?: string;
  backLabel?: string;
}

export function ErrorPage({
  title,
  message,
  onRetry,
  onGoBack,
  showBackButton = true,
  showRetryButton = true,
  retryLabel,
  backLabel,
}: ErrorPageProps) {
  const router = useRouter();
  const { t } = useTranslation();

  // Resolved here rather than as parameter defaults: a default cannot call a
  // hook, and a caller that passes its own label still wins.
  const resolvedTitle = title ?? t('common.errorTitle');
  const resolvedMessage = message ?? t('common.errorMessage');
  const resolvedRetryLabel = retryLabel ?? t('common.retry');
  const resolvedBackLabel = backLabel ?? t('common.goBack');

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-5">
      {/* Error Icon */}
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-500/10">
        <Icon as={AlertTriangleIcon} size={48} className="text-red-500" color="#ef4444" />
      </View>

      {/* Title */}
      <Text variant="h1" className="mb-3 text-center text-3xl font-bold">
        {resolvedTitle}
      </Text>

      {/* Message */}
      <Text variant="muted" className="mb-8 text-center text-base leading-6">
        {resolvedMessage}
      </Text>

      {/* Action Buttons */}
      <View className="w-full gap-3">
        {showRetryButton && onRetry && (
          <Button className="w-full shadow-lg" size="lg" onPress={handleRetry}>
            <Icon as={RefreshCwIcon} size={20} />
            <Text className="font-bold">{resolvedRetryLabel}</Text>
          </Button>
        )}

        {showBackButton && (
          <Button variant="outline" className="w-full border-2" size="lg" onPress={handleGoBack}>
            <Icon as={ArrowLeftIcon} size={20} />
            <Text className="font-semibold">{resolvedBackLabel}</Text>
          </Button>
        )}
      </View>
    </View>
  );
}

