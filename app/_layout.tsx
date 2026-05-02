import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </ThemeProvider>
  );
}
