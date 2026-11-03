import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, type LucideIcon } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastVariant = 'error' | 'success' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 4000;
/** Older toasts are dropped rather than stacked: three is what fits on a phone. */
const MAX_TOASTS = 3;

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const VARIANT: Record<ToastVariant, { icon: LucideIcon; iconClassName: string }> = {
  error: { icon: CircleAlertIcon, iconClassName: 'text-destructive' },
  success: { icon: CircleCheckIcon, iconClassName: 'text-emerald-500' },
  info: { icon: InfoIcon, iconClassName: 'text-primary' },
};

/**
 * App-wide notifications, one place and one shape.
 *
 * Replaces the mix this app grew: `Alert.alert` (which react-native-web stubs
 * out to a no-op, so web users saw nothing at all), inline error text on a
 * couple of screens, and `console.error` - which in development is the LogBox
 * popup, the thing these are supposed to stop showing.
 *
 * Rendered as an overlay rather than through a portal: it sits at the root,
 * above every screen and above the modal stack, and `pointerEvents="box-none"`
 * keeps the rest of the window usable while it is up.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const text = message.trim();
    if (!text) return;

    setToasts((current) => {
      // One message, one toast. The same failure reaches the provider from more
      // than one reporter (see lib/api-error.ts), and a failing background
      // request can repeat it while the first is still on screen.
      if (current.some((toast) => toast.message === text)) return current;

      const next: ToastRecord = {
        id: nextId.current++,
        message: text,
        variant: options?.variant ?? 'error',
        duration: options?.duration ?? DEFAULT_DURATION_MS,
      };
      return [...current, next].slice(-MAX_TOASTS);
    });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <View className="flex-1">
      <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View
          pointerEvents="box-none"
          className="items-center gap-2 px-4"
          style={{ paddingTop: insets.top + 8 }}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaving = useRef(false);

  const hide = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(({ finished }) => {
      if (finished) onDismiss(toast.id);
    });
  }, [onDismiss, opacity, toast.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    // The timer is what dismisses a toast nobody touched; a press goes through
    // `hide` and clears it, so the exit animation is never run twice.
    timer.current = setTimeout(hide, toast.duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hide, opacity, toast.duration, translateY]);

  const { icon: ToastIcon, iconClassName } = VARIANT[toast.variant];

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        width: '100%',
        alignItems: 'center',
      }}>
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        // Dismissing by pressing anywhere on it: there is no close button, and a
        // message that outlives its usefulness should not need one.
        className="w-full max-w-md flex-row items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg">
        <Icon as={ToastIcon} size={18} className={cn('mt-0.5 shrink-0', iconClassName)} />
        <Text className="flex-1 text-sm leading-5 text-popover-foreground">{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}
