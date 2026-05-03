import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/design/ThemeProvider';

export default function CustomerTabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  function renderIcon(name: IconName) {
    return function TabIcon({ color, size }: { color: string; size: number }) {
      return <Icon name={name} size={size} colorHex={color} />;
    };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.brand[500],
        tabBarInactiveTintColor: theme.colors.muted,
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('app.tabs.home'), tabBarIcon: renderIcon('home') }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('app.tabs.bookings'),
          tabBarIcon: renderIcon('calendar'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('app.tabs.settings'),
          tabBarIcon: renderIcon('settings'),
        }}
      />
    </Tabs>
  );
}
