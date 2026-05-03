import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { COMMON_IANA_ZONES } from '@/data/iana-zones';
import { colors } from '@/design/colors';
import { getDeviceTimezone } from '@/hooks/useDisplayTimezone';

// The persistent admin timezone override lives in `profiles.display_timezone_override`,
// which is added to the schema in define-tenancy-model. Until that lands, this screen
// reads/writes a local placeholder and won't round-trip — wiring it up is the first
// task in implement-admin-mobile-dashboard.
type Props = {
  current: string | null;
  onSelect: (zone: string | null) => Promise<void> | void;
};

export function TimezonePicker({ current, onSelect }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const deviceZone = useMemo(getDeviceTimezone, []);
  const sorted = useMemo(() => {
    const set = new Set<string>(COMMON_IANA_ZONES);
    set.add(deviceZone);
    return Array.from(set).sort();
  }, [deviceZone]);

  const choose = async (zone: string | null) => {
    setPending(zone ?? '__clear__');
    try {
      await onSelect(zone);
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => choose(deviceZone)}
        accessibilityRole="button"
        accessibilityLabel={`Use my current timezone, ${deviceZone}`}
        style={[styles.row, styles.devicePin]}
      >
        <Text style={styles.deviceLabel}>I&apos;m here right now</Text>
        <Text style={styles.deviceValue}>{deviceZone}</Text>
      </Pressable>
      <Pressable
        onPress={() => choose(null)}
        accessibilityRole="button"
        accessibilityLabel="Use tenant timezone (no override)"
        style={styles.row}
      >
        <Text style={styles.label}>Tenant timezone (default)</Text>
        {!current && <Text style={styles.check}>✓</Text>}
      </Pressable>
      <FlatList
        data={sorted}
        keyExtractor={(z) => z}
        renderItem={({ item: zone }) => (
          <Pressable
            onPress={() => choose(zone)}
            accessibilityRole="button"
            accessibilityLabel={zone}
            style={styles.row}
          >
            <Text style={styles.label}>{zone}</Text>
            {(current === zone || pending === zone) && <Text style={styles.check}>✓</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

export default function TimezoneSettingsScreen() {
  const [current, setCurrent] = useState<string | null>(null);
  const onSelect = async (zone: string | null) => {
    setCurrent(zone);
    // Persistence to profiles.display_timezone_override lands in implement-admin-mobile-dashboard.
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Display timezone',
          headerBackVisible: true,
          headerLeft: () =>
            router.canGoBack() ? (
              <Pressable onPress={() => router.back()} accessibilityRole="button">
                <Text style={styles.back}>Back</Text>
              </Pressable>
            ) : null,
        }}
      />
      <TimezonePicker current={current} onSelect={onSelect} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 16 },
  check: { fontSize: 16, color: colors.brand500, fontWeight: '600' },
  devicePin: { backgroundColor: colors.brandTint, borderRadius: 12, marginBottom: 8 },
  deviceLabel: { fontSize: 14, fontWeight: '600' },
  deviceValue: { fontSize: 14, opacity: 0.7 },
  back: { fontSize: 14, color: colors.brand500, paddingHorizontal: 12 },
});
