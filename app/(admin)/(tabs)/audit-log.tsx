import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { getTenantAuditEvents } from '@/services/api/audit';
import { useTenantStore } from '@/state/tenantStore';
import { type TenantAuditEvent } from '@/types/db';

export default function AuditLogScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );

  const [events, setEvents] = useState<TenantAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentTenantId) return;
    setLoading(true);
    setError(null);
    getTenantAuditEvents(currentTenantId, { limit: 50 })
      .then(setEvents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [currentTenantId]);

  return (
    <>
      <Stack.Screen options={{ title: t('audit.title') }} />
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        {loading ? (
          <ActivityIndicator color={theme.colors.brand[500]} />
        ) : error ? (
          <EmptyState icon="alert-triangle" title={t('errors.generic')} body={error.message} />
        ) : events.length === 0 ? (
          <EmptyState icon="calendar" title={t('audit.empty')} />
        ) : (
          <FlatList
            data={events}
            keyExtractor={(e) => e.id}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
            )}
            renderItem={({ item }) => (
              <AuditRow
                event={item}
                tenantTimezone={tenant?.timezone ?? null}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            )}
          />
        )}
      </View>
    </>
  );
}

function AuditRow({
  event,
  tenantTimezone,
  expanded,
  onToggle,
}: {
  event: TenantAuditEvent;
  tenantTimezone: string | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const actorLabel =
    event.by_kind === 'guest_token'
      ? t('audit.actorGuestToken')
      : event.by_kind === 'system'
        ? t('audit.actorSystem')
        : (event.by_user_id ?? t('audit.actorUnknown'));

  return (
    <Pressable onPress={onToggle} accessibilityRole="button" style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="bodyStrong">{t(`audit.kind.${event.kind}`)}</Text>
        <Time
          value={event.created_at}
          context="admin"
          tenantTimezone={tenantTimezone}
          format="long"
          style={{ color: theme.colors.muted }}
        />
      </View>
      <Text variant="caption" color="muted">
        {actorLabel}
      </Text>
      {expanded && (
        <View style={[styles.payload, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text variant="caption" color="muted">
            {JSON.stringify(event.payload, null, 2)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth },
  row: { paddingVertical: 12, paddingHorizontal: 16, gap: 4 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  payload: { marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
});
