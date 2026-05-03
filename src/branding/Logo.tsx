import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken, resolveColor } from '@/design/theme';

type Props = {
  height?: number;
  color?: ColorToken;
  style?: StyleProp<TextStyle>;
};

// Placeholder wordmark — renders the latin or arabic form via RN <Text> so
// the OS handles Arabic shaping (letters connect correctly). The SVG
// approach produced isolated-form characters because react-native-svg's
// <text> element doesn't run the shaping algorithm reliably. Designer-cut
// SVG paths replace this in the brand-assets-final PR.
export function Logo({ height = 32, color = 'text', style }: Props) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const word = i18n.language === 'ar' ? 'ميعادي' : 'ma3ady';
  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel={word}
      style={[
        styles.base,
        { color: resolveColor(theme, color), fontSize: height, lineHeight: height * 1.1 },
        style,
      ]}
    >
      {word}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: '700' },
});
