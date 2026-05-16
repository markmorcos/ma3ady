import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '@/design/ThemeProvider';
import { Text } from './Text';

/**
 * Material Design 3 top app bar.
 *
 * `small`  — single-line title, leading + trailing actions. 64dp.
 * `center` — centered title. Used for booking flows.
 * `large`  — large headline title. 112dp (subtle scroll-collapse in callers).
 */
export type TopAppBarVariant = 'small' | 'center' | 'large';

type Props = {
  title: string;
  subtitle?: string;
  variant?: TopAppBarVariant;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function TopAppBar({ title, subtitle, variant = 'small', leading, trailing }: Props) {
  const theme = useTheme();
  const isLarge = variant === 'large';
  const isCenter = variant === 'center';
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          minHeight: isLarge ? 112 : 64,
          paddingTop: isLarge ? 12 : 8,
          paddingBottom: isLarge ? 16 : 8,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leading}>{leading}</View>
        {!isLarge && (
          <View style={[styles.titleWrap, isCenter ? styles.center : null]}>
            <Text variant="titleLg" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySm" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
        <View style={styles.trailing}>{trailing}</View>
      </View>
      {isLarge ? (
        <View style={styles.largeTitleBlock}>
          <Text variant="headlineMd" style={{ color: theme.colors.onSurface }}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodyMd" style={{ color: theme.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 8,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leading: { width: 48, alignItems: 'center', justifyContent: 'center' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingEnd: 8 },
  titleWrap: { flex: 1, paddingHorizontal: 8 },
  center: { alignItems: 'center' },
  largeTitleBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 2,
  },
});
