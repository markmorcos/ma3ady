import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken, resolveColor } from '@/design/theme';
import { type TypographyVariant } from '@/design/tokens';

type Props = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
};

export function Text({ variant = 'body', color, style, ...rest }: Props) {
  const theme = useTheme();
  const variantStyle = theme.typography[variant];
  const resolved = color ? resolveColor(theme, color) : theme.colors.text;
  return <RNText style={[styles.base, variantStyle, { color: resolved }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false } as never,
});
