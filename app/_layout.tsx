import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { runBootSequence } from '@/boot/bootSequence';
import { defaultRunners } from '@/boot/defaultRunners';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { ThemeProvider } from '@/design/ThemeProvider';
import { useAppStore } from '@/state/appStore';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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

// NOTE: <GestureHandlerRootView> is required at the root for `@gorhom/bottom-sheet`
// to receive gestures. We omit it here because (1) no screen mounts a <Sheet> yet
// and (2) gesture-handler's New Architecture requirement crashes in Expo Go SDK 54
// (TurboModule ABI mismatch). Re-add the wrapper alongside the first feature
// that actually renders a bottom sheet, in a dev-client build.
