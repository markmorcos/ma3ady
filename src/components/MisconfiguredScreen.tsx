// Pure-RN diagnostic screen for the misconfigured boot state.
//
// Deliberately does NOT use i18n: this screen renders when the very first
// boot phase (config validation) fails, which is *before* the i18n runner has
// loaded any translations. So everything here is English-only and
// self-contained. Users shouldn't see this in shipped builds -- it's a
// developer-facing safety net for the case where someone publishes an APK
// without the required EXPO_PUBLIC_* variables baked in.
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const palette = {
  bg: '#0C0A09',
  panel: '#1C1917',
  fg: '#FAFAF9',
  muted: '#A8A29E',
  warn: '#FBBF24',
  border: '#292524',
};

const MISSING_PREFIX = 'missing_env: ';

export function MisconfiguredScreen({ error }: { error: Error | null }) {
  const message = error?.message ?? 'Unknown configuration error';
  const missing = message.startsWith(MISSING_PREFIX)
    ? message
        .slice(MISSING_PREFIX.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>App not configured</Text>
      <Text style={styles.body}>
        This build is missing runtime configuration it needs to boot.
      </Text>

      {missing.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.label}>Missing environment variables:</Text>
          {missing.map((name) => (
            <Text key={name} style={styles.envVar}>
              {name}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.label}>Raw error:</Text>
        <Text style={styles.mono}>{message}</Text>
      </View>

      <Text style={styles.hint}>
        EXPO_PUBLIC_* variables are baked into the JS bundle at build time, so
        setting them on the device will not help -- rebuild the APK with the
        values set in GitHub Secrets (or your local .env) and re-install.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 32, gap: 16 },
  title: { color: palette.warn, fontSize: 22, fontWeight: '700', marginTop: 60 },
  body: { color: palette.fg, fontSize: 15, lineHeight: 22 },
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: { color: palette.muted, fontSize: 13 },
  envVar: { color: palette.fg, fontSize: 14, fontFamily: 'monospace' },
  mono: { color: palette.fg, fontSize: 12, fontFamily: 'monospace' },
  hint: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
