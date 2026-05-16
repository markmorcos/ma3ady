import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { buildTheme, type Theme } from './theme';
import { DEFAULT_SOURCE_HEX } from './palette';
import { useTenantStore } from '@/state/tenantStore';

export type ThemePreference = 'light' | 'dark' | 'system';

export const STORAGE_KEY_THEME = 'app.theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // The active tenant drives the palette source color. When no tenant is
  // active (anonymous public booking, pre-sign-in, mid-onboarding) we fall
  // back to the Ma3ady default source.
  const activeTenant = useTenantStore((s) =>
    s.tenants.find((t) => t.id === s.currentTenantId),
  );
  const sourceHex = activeTenant?.brand_color ?? DEFAULT_SOURCE_HEX;

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_THEME);
      if (!mounted) return;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY_THEME, next);
  };

  const mode = useMemo<'light' | 'dark'>(() => {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  const theme = useMemo<Theme>(
    () => buildTheme({ mode, sourceHex }),
    [mode, sourceHex],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference }),
    [theme, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return ctx.theme;
}

export function useThemePreference(): {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference() must be used inside <ThemeProvider>');
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}
