import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

type Props = ViewProps & { padded?: boolean };

export function Card({ padded = true, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
});
