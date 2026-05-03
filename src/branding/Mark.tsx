import { type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTheme } from '@/design/ThemeProvider';
import { type ColorToken, resolveColor } from '@/design/theme';
import { mark } from './assets';

type Props = {
  size?: number;
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

export function Mark({ size = 32, color = 'text', style }: Props) {
  const theme = useTheme();
  return (
    <SvgXml
      xml={mark}
      width={size}
      height={size}
      color={resolveColor(theme, color)}
      style={style}
    />
  );
}
