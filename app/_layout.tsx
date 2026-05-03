import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { runBootSequence } from '@/boot/bootSequence';
import { defaultRunners } from '@/boot/defaultRunners';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { useAppStore } from '@/state/appStore';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout() {
  const bootPhase = useAppStore((s) => s.bootPhase);

  useEffect(() => {
    void runBootSequence(defaultRunners);
  }, []);

  useEffect(() => {
    if (bootPhase === 'ready' || bootPhase === 'degraded') {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [bootPhase]);

  return (
    <RootErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </I18nProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  );
}
