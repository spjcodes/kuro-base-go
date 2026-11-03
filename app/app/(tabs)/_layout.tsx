import { Tabs } from 'expo-router';
import { HomeIcon, UserIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Platform, View } from 'react-native';
import { WebTabBar } from '@/components/custom/web-tab-bar';
import { useTranslation } from '@/lib/i18n';

export default function TabsLayout() {
  // Read here rather than from module constants: these are route options, and a
  // constant would freeze them in whatever language the bundle was built in.
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  return (
    // On web the navigator's own bottom bar is hidden and WebTabBar is drawn
    // above it instead; on native this wrapper is transparent and the bar is
    // exactly as it was.
    <View className="flex-1 bg-background">
      {Platform.OS === 'web' ? <WebTabBar /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          // `display: 'none'` rather than unmounting the navigator's bar: the
          // navigator still owns the tab state and the screens; only the visual
          // bar is replaced.
          tabBarStyle:
            Platform.OS === 'web'
              ? { display: 'none' }
              : {
                  backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                  borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e5e5',
                  borderTopWidth: 1,
                  paddingBottom: 0,
                  height: 60,
                },
          tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#000',
          tabBarInactiveTintColor: colorScheme === 'dark' ? '#666' : '#999',
        }}>
        <Tabs.Screen
          name="(home)"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
