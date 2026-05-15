import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/Icon';
import { useTheme } from '@/design/ThemeProvider';

export default function AdminTabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  function renderIcon(name: IconName) {
    return function TabIcon({ color, size }: { color: string; size: number }) {
      return <IconWithColor name={name} size={size} color={color} />;
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
        options={{ title: t('admin.tabs.today'), tabBarIcon: renderIcon('home') }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: t('admin.tabs.upcoming'),
          tabBarIcon: renderIcon('calendar'),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('admin.tabs.services'),
          tabBarIcon: renderIcon('scissors'),
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: t('admin.tabs.availability'),
          tabBarIcon: renderIcon('calendar-clock'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('admin.tabs.settings'),
          tabBarIcon: renderIcon('settings'),
        }}
      />
      <Tabs.Screen name="audit-log" options={{ href: null }} />
    </Tabs>
  );
}

// Bottom-tabs passes a raw color string for the icon, but the Icon component
// types its `color` prop as a design-system token. Pass the color through as
// a style override so we don't need to widen the public Icon API.
function IconWithColor({
  name,
  size,
  color,
}: {
  name: IconName;
  size: number;
  color: string;
}) {
  return <Icon name={name} size={size} colorHex={color} />;
}
