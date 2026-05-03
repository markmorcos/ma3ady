import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { i18next } from '@/i18n';
import { colors } from '@/design/colors';
import { logError } from '@/services/observability/logError';

type State = { error: Error | null };
type Props = { children: ReactNode };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
    void logError(error, {
      kind: 'boundary',
      context: { source: 'RouteErrorBoundary', componentStack: info.componentStack },
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
    this.reset();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const t = i18next.t.bind(i18next);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.routeErrorTitle')}</Text>
        <Pressable
          onPress={this.goBack}
          accessibilityRole="button"
          accessibilityLabel={t('errors.goBack')}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{t('errors.goBack')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  cta: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.brand500,
  },
  ctaText: { color: colors.white, fontWeight: '600' },
});
