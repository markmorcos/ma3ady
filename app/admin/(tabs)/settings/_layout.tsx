import { Stack } from 'expo-router';
import { useTheme } from '@/design/ThemeProvider';

export default function SettingsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    />
  );
}
