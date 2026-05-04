import { useTheme } from '@/design/ThemeProvider';

/**
 * Returns react-navigation header options that follow the active theme.
 * Use whenever a screen sets `headerShown: true` so the platform's default
 * white bar doesn't clash with the rest of the app.
 */
export function useThemedHeaderOptions(title?: string) {
  const theme = useTheme();
  return {
    headerShown: true,
    title,
    headerStyle: { backgroundColor: theme.colors.bg },
    headerTitleStyle: { color: theme.colors.text },
    headerTintColor: theme.colors.brand[500],
    headerShadowVisible: false,
  };
}
