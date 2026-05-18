import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import {
  listClientErrors,
  type ClientError,
} from '@/services/api/clientErrors';
import { type ClientErrorKind } from '@/services/observability/logError';
import { useTenantStore } from '@/state/tenantStore';

const KINDS: (ClientErrorKind | 'all')[] = [
  'all',
  'boundary',
  'unhandled_rejection',
  'manual',
  'network',
  'rls_denied',
];

const RANGES: { key: 'day' | 'week' | 'month'; days: number }[] = [
  { key: 'day', days: 1 },
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
];

export default function ErrorsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );

  const [kind, setKind] = useState<ClientErrorKind | 'all'>('all');
  const [days, setDays] = useState<number>(7);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['client-errors', tenant?.id, kind, days],
    queryFn: () =>
      listClientErrors({
        tenantId: tenant?.id ?? '',
        kind: kind === 'all' ? undefined : kind,
        since: since.toISOString(),
        limit: 100,
      }),
    enabled: !!tenant?.id,
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      <Stack.Screen options={{ title: t('errorViewer.title') }} />
      <View style={styles.filterRow}>
        {KINDS.map((k) => (
          <Pill
            key={k}
            label={t(`errorViewer.kind.${k}`)}
            active={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </View>
      <View style={styles.filterRow}>
        {RANGES.map((r) => (
          <Pill
            key={r.key}
            label={t(`errorViewer.range.${r.key}`)}
            active={days === r.days}
            onPress={() => setDays(r.days)}
          />
        ))}
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      ) : errors.length === 0 ? (
        <EmptyState icon="circle-alert" title={t('errorViewer.empty')} />
      ) : (
        <FlatList
          data={errors}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <ErrorRow item={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: active ? theme.colors.brand[500] : theme.colors.border,
          backgroundColor: active ? theme.colors.brandTint : 'transparent',
        },
      ]}
    >
      <Text
        style={{ color: active ? theme.colors.brand[600] : theme.colors.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorRow({ item }: { item: ClientError }) {
  const theme = useTheme();
  const meta = [item.platform, item.app_version ? `v${item.app_version}` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/admin/dev-tools/error/[id]',
          params: { id: item.id },
        })
      }
      style={[styles.row, { borderColor: theme.colors.border }]}
    >
      <Text style={styles.kind}>{item.kind}</Text>
      <Text numberOfLines={2} style={styles.msg}>
        {item.message}
      </Text>
      <Time
        value={item.created_at}
        context="admin"
        format="datetime"
        style={[styles.meta, { color: theme.colors.muted }]}
      />
      {meta ? (
        <Text style={[styles.meta, { color: theme.colors.muted }]}>{meta}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  kind: { fontWeight: '600', fontSize: 13 },
  msg: { fontSize: 14 },
  meta: { fontSize: 12 },
});
