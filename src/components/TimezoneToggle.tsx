import { Pressable, StyleSheet, Text } from 'react-native';
import { getDeviceTimezone } from '@/hooks/useDisplayTimezone';
import { useSessionPrefsStore } from '@/state/sessionPrefsStore';

type Props = {
  tenantTimezone: string;
};

export function TimezoneToggle({ tenantTimezone }: Props) {
  const override = useSessionPrefsStore((s) => s.displayTimezoneOverride);
  const setOverride = useSessionPrefsStore((s) => s.setDisplayTimezoneOverride);
  const deviceZone = getDeviceTimezone();
  const showingDevice = override === deviceZone;
  const same = deviceZone === tenantTimezone;

  if (same) return null;

  const onToggle = () => setOverride(showingDevice ? null : deviceZone);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={showingDevice ? `Show times in ${tenantTimezone}` : `Show times in ${deviceZone}`}
      style={styles.button}
    >
      <Text style={styles.label}>
        {showingDevice ? `Showing your time · tap for ${tenantTimezone}` : `Showing ${tenantTimezone} · tap for your time`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 8, paddingHorizontal: 12 },
  label: { fontSize: 12, opacity: 0.7 },
});
