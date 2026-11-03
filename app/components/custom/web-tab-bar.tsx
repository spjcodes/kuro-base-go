import { usePathname, useRouter, type Href } from 'expo-router';
import { HomeIcon, UserIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type WebTabLabel = 'tabs.home' | 'tabs.profile';

interface WebTab {
  href: Href;
  label: WebTabLabel;
  icon: LucideIcon;
  /**
   * The pathname the tab owns. Group segments - `(tabs)`, `(home)` - never
   * appear in it, so this is the URL the user actually sees.
   */
  path: string;
}

const WEB_TABS: WebTab[] = [
  { href: '/(tabs)/(home)', label: 'tabs.home', icon: HomeIcon, path: '/' },
  { href: '/(tabs)/profile', label: 'tabs.profile', icon: UserIcon, path: '/profile' },
];

/**
 * The tab navigator, laid out as a horizontal bar above the content instead of
 * a bottom bar, which is what a desktop browser expects.
 *
 * A second bar rather than moving the real one: the bottom-tabs navigator has no
 * top placement, and faking it with absolute positioning would fight the
 * navigator's own layout. On web `(tabs)/_layout.tsx` hides the real bar and
 * renders this one outside the navigator; on native both this component and the
 * switch are absent, so nothing changes there.
 */
export function WebTabBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (tab: WebTab) =>
    pathname === tab.path || pathname.startsWith(`${tab.path}/`);

  return (
    <View className="border-b border-border bg-background">
      <View className="h-14 w-full flex-row items-center justify-center gap-1 px-5">
        {WEB_TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Pressable
              key={tab.label}
              onPress={() => router.navigate(tab.href)}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              className={cn(
                'flex-row items-center gap-2 rounded-full px-4 py-2',
                active ? 'bg-secondary' : 'hover:bg-muted'
              )}>
              <Icon
                as={tab.icon}
                size={16}
                className={active ? 'text-foreground' : 'text-muted-foreground'}
              />
              <Text
                className={cn(
                  'text-sm',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}>
                {t(tab.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
