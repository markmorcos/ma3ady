import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';

type Tone = 'primary' | 'tertiary' | 'secondary';

type Props = {
  label: string;
  value: string;
  tone?: Tone;
  icon?: IconName;
};

/**
 * 3-up stat tile used on the admin Today dashboard. Coloured per the M3
 * container roles so the three tiles read as a rhythmic row of glanceable
 * KPIs (today / this week / no-show rate).
 */
export function StatsCard({ label, value, tone = 'primary', icon }: Props) {
  const theme = useTheme();

  const palette = (() => {
    switch (tone) {
      case 'tertiary':
        return {
          bg: theme.colors.tertiaryContainer,
          fg: theme.colors.onTertiaryContainer,
        };
      case 'secondary':
        return {
          bg: theme.colors.secondaryContainer,
          fg: theme.colors.onSecondaryContainer,
        };
      case 'primary':
      default:
        return {
          bg: theme.colors.primaryContainer,
          fg: theme.colors.onPrimaryContainer,
        };
    }
  })();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: palette.bg,
          borderRadius: theme.shape.xl,
        },
      ]}
    >
      {icon ? (
        <View style={styles.iconCorner}>
          <Icon name={icon} size={18} colorHex={palette.fg + '8C'} />
        </View>
      ) : null}
      <Text
        variant="displaySm"
        style={[styles.value, { color: palette.fg }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        variant="labelMd"
        style={[
          styles.label,
          { color: palette.fg, textTransform: 'uppercase', letterSpacing: 0.5 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  iconCorner: { position: 'absolute', top: 12, insetInlineEnd: 12 },
  value: { marginTop: 8 },
  label: { marginTop: 4 },
});
