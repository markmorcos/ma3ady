import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { type AdminAppointment } from '@/services/api/admin';

type Props = {
  appointments: AdminAppointment[];
  tenantTimezone: string;
};

function isNowWithin(a: AdminAppointment, now: number): boolean {
  return new Date(a.starts_at).getTime() <= now && new Date(a.ends_at).getTime() > now;
}

/**
 * Material Design 3 timeline used on the admin Today dashboard. Renders a
 * leading 2dp rule with one 10dp dot per appointment; the row whose window
 * brackets `now()` becomes a primary-container card with a 2dp primary
 * border and a glowing dot pulse to read as the active appointment.
 */
export function AppointmentTimeline({ appointments, tenantTimezone }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const now = Date.now();
  return (
    <View style={styles.container}>
      <View style={[styles.rule, { backgroundColor: theme.colors.outlineVariant }]} />
      {appointments.map((a) => {
        const live = isNowWithin(a, now);
        const card = live
          ? theme.colors.primaryContainer
          : theme.colors.surfaceContainerHigh;
        const fg = live ? theme.colors.onPrimaryContainer : theme.colors.onSurface;
        const subFg = live
          ? theme.colors.onPrimaryContainer
          : theme.colors.onSurfaceVariant;
        const dotInner = live ? theme.colors.primary : theme.colors.outline;
        return (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(admin)/appointment/[id]',
                params: { id: a.id },
              })
            }
            style={styles.row}
          >
            <View style={styles.gutter}>
              <Time
                value={a.starts_at}
                context="admin"
                tenantTimezone={tenantTimezone}
                format="short"
                style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              />
              <View style={styles.dotWrap}>
                {live ? (
                  <View
                    style={[
                      styles.dotPulse,
                      { backgroundColor: theme.colors.primary + '4D' },
                    ]}
                  />
                ) : null}
                <View
                  style={[
                    styles.dotInner,
                    {
                      backgroundColor: dotInner,
                      borderWidth: live ? 0 : 2,
                      borderColor: theme.colors.surface,
                    },
                  ]}
                />
              </View>
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: card,
                  borderRadius: theme.shape.lg,
                  borderColor: live ? theme.colors.primary : 'transparent',
                  borderWidth: live ? 2 : 0,
                },
              ]}
            >
              <View style={styles.body}>
                <Text variant="titleMd" style={{ color: fg }} numberOfLines={1}>
                  {a.guest_contact?.name ?? '—'}
                </Text>
                {a.service ? (
                  <Text variant="bodyMd" style={{ color: subFg }} numberOfLines={1}>
                    {a.service.name}
                  </Text>
                ) : null}
              </View>
              {live ? (
                <View
                  style={[
                    styles.nowChip,
                    {
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.shape.full,
                    },
                  ]}
                >
                  <Text
                    variant="labelMd"
                    style={{ color: theme.colors.onPrimary, letterSpacing: 0.5 }}
                  >
                    {t('admin.now')}
                  </Text>
                </View>
              ) : (
                <StatusBadge status={a.status} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingStart: 8 },
  rule: {
    position: 'absolute',
    insetInlineStart: 64,
    top: 8,
    bottom: 8,
    width: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  gutter: {
    width: 64,
    alignItems: 'center',
    paddingTop: 14,
    gap: 8,
  },
  dotWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotInner: { width: 10, height: 10, borderRadius: 5 },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  body: { flex: 1, gap: 2 },
  nowChip: { paddingVertical: 4, paddingHorizontal: 10 },
});
