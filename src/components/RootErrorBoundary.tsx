import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { colors } from '@/design/colors';

type State = { error: Error | null };

type Props = { children: ReactNode };

async function reportError(error: Error, info: ErrorInfo) {
  // The `report-client-error` Edge Function lands in setup-observability.
  // Until then, log to console; we still want a structured log line so
  // bug reports include stack + componentStack.
  console.error('[RootErrorBoundary]', {
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
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
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ma3ady ran into a problem</Text>
        <Text style={styles.body}>{this.state.error.message}</Text>
        <Pressable
          onPress={restart}
          accessibilityRole="button"
          accessibilityLabel="Restart"
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Restart</Text>
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
