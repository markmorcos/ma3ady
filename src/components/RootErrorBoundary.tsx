import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { i18next } from '@/i18n';
import { colors } from '@/design/colors';
import { logError } from '@/services/observability/logError';

type State = { error: Error | null };

type Props = { children: ReactNode };

async function reportError(error: Error, info: ErrorInfo) {
  console.error('[RootErrorBoundary]', {
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
  });
  void logError(error, {
    kind: 'boundary',
    context: { source: 'RootErrorBoundary', componentStack: info.componentStack },
  });
}

async function restart() {
  try {
    await Updates.reloadAsync();
  } catch {
    // In Expo Go / dev, Updates.reloadAsync() is unavailable — fall back to no-op.
  }
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportError(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Class component — read translations via the i18next instance directly.
    const t = i18next.t.bind(i18next);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.appCrashTitle')}</Text>
        <Text style={styles.body}>{this.state.error.message}</Text>
        <Pressable
          onPress={restart}
          accessibilityRole="button"
          accessibilityLabel={t('errors.restart')}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{t('errors.restart')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  cta: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.brand500,
  },
  ctaText: { color: colors.white, fontWeight: '600' },
});
