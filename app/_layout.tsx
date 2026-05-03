import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { runBootSequence } from '@/boot/bootSequence';
import { defaultRunners } from '@/boot/defaultRunners';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { ToastViewport } from '@/components/Toast';
import { ThemeProvider, useTheme } from '@/design/ThemeProvider';
import { setupGlobalHandlers } from '@/services/observability/setupGlobalHandlers';
import { useAppStore } from '@/state/appStore';

setupGlobalHandlers();

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function ThemedSafeArea({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: theme.colors.bg }]}
    >
      {children}
    </SafeAreaView>
  );
}

function ThemedStack() {
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

export default function RootLayout() {
  const bootPhase = useAppStore((s) => s.bootPhase);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    void runBootSequence(defaultRunners);
  }, []);

  useEffect(() => {
    if (bootPhase === 'ready' || bootPhase === 'degraded') {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [bootPhase]);

  return (
    <SafeAreaProvider>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <I18nProvider>
              <ThemedSafeArea>
                <ThemedStack />
                <ToastViewport />
              </ThemedSafeArea>
            </I18nProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </RootErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});

// NOTE: <GestureHandlerRootView> is required at the root for `@gorhom/bottom-sheet`
// to receive gestures. We omit it here because (1) no screen mounts a <Sheet> yet
// and (2) gesture-handler's New Architecture requirement crashes in Expo Go SDK 54
// (TurboModule ABI mismatch). Re-add the wrapper alongside the first feature
// that actually renders a bottom sheet, in a dev-client build.
