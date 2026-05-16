import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

/**
 * Material Design 3 card.
 *
 * `filled`   — `surfaceContainerHigh` bg, no border. Default.
 * `outlined` — transparent bg, `outlineVariant` 1px border.
 * `elevated` — `surfaceContainerLow` bg + level1 shadow.
 * `primary`  — `primaryContainer` bg. Featured / CTA cards.
 * `tertiary` — `tertiaryContainer` bg. Accent cards (share, etc.).
 */
export type CardKind = 'filled' | 'outlined' | 'elevated' | 'primary' | 'tertiary';

type Props = ViewProps & {
  kind?: CardKind;
  padded?: boolean;
};

export function Card({ kind = 'filled', padded = true, style, ...rest }: Props) {
  const theme = useTheme();
  const radius = theme.expressive ? theme.shape.xl : theme.shape.md;

  let bg: string;
  let borderColor = 'transparent';
  let borderWidth = 0;
  let shadow = theme.elevation.level0;
  switch (kind) {
    case 'outlined':
      bg = 'transparent';
      borderColor = theme.colors.outlineVariant;
      borderWidth = 1;
      break;
    case 'elevated':
      bg = theme.colors.surfaceContainerLow;
      shadow = theme.elevation.level1;
      break;
    case 'primary':
      bg = theme.colors.primaryContainer;
      break;
    case 'tertiary':
      bg = theme.colors.tertiaryContainer;
      break;
    case 'filled':
    default:
      bg = theme.colors.surfaceContainerHigh;
      break;
  }

  return (
    <View
      style={[
        shadow,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
          borderRadius: radius,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
