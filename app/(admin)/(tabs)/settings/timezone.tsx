import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { COMMON_IANA_ZONES } from '@/data/iana-zones';
import { useTheme } from '@/design/ThemeProvider';
import { getDeviceTimezone } from '@/hooks/useDisplayTimezone';
import { useThemedHeaderOptions } from '@/hooks/useThemedHeader';

type Props = {
  current: string | null;
  onSelect: (zone: string | null) => Promise<void> | void;
};

export function TimezonePicker({ current, onSelect }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
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

  const rowBorder = { borderBottomColor: theme.colors.border };
  const checkColor = theme.colors.brand[500];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => choose(deviceZone)}
        accessibilityRole="button"
        accessibilityLabel={`${t('admin.tzHereNow')} ${deviceZone}`}
        style={[styles.row, styles.devicePin, { backgroundColor: theme.colors.brandTint }]}
      >
        <Text variant="bodyStrong">{t('admin.tzHereNow')}</Text>
        <Text variant="caption" color="muted">
          {deviceZone}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => choose(null)}
        accessibilityRole="button"
        accessibilityLabel={t('admin.tzUseTenantA11y')}
        style={[styles.row, rowBorder]}
      >
        <Text variant="body">{t('admin.tzTenantDefault')}</Text>
        {!current && <Icon name="check" size={18} colorHex={checkColor} />}
      </Pressable>
      <FlatList
        data={sorted}
        keyExtractor={(z) => z}
        renderItem={({ item: zone }) => (
          <Pressable
            onPress={() => choose(zone)}
            accessibilityRole="button"
            accessibilityLabel={zone}
            style={[styles.row, rowBorder]}
          >
            <Text variant="body">{zone}</Text>
            {(current === zone || pending === zone) && (
              <Icon name="check" size={18} colorHex={checkColor} />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

export default function TimezoneSettingsScreen() {
  const { t } = useTranslation();
  const headerOptions = useThemedHeaderOptions(t('admin.settingsDisplayTimezone'));
  const [current, setCurrent] = useState<string | null>(null);
  const onSelect = async (zone: string | null) => {
    setCurrent(zone);
    // Persistence to profiles.display_timezone_override lands as a follow-up.
  };
  return (
    <>
      <Stack.Screen
        options={{
          ...headerOptions,
          headerLeft: () =>
            router.canGoBack() ? (
              <Pressable onPress={() => router.back()} accessibilityRole="button">
                <Text variant="bodyStrong" color="brand.500" style={styles.back}>
                  {t('common.back')}
                </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devicePin: {
    borderRadius: 12,
    marginBottom: 8,
    borderBottomWidth: 0,
  },
  back: { paddingHorizontal: 12 },
});
