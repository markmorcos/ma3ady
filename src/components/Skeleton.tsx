import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

// RN's built-in Animated is used here instead of Reanimated. Reanimated 4
// requires the New Architecture and crashes in Expo Go SDK 54. The opacity
// loop is simple enough that the JS-driven Animated API is fine.
export function Skeleton({ width = '100%', height = 16, radius, style }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const base = useMemo<ViewStyle>(
    () => ({
      width: width as ViewStyle['width'],
      height,
      backgroundColor: theme.colors.border,
      borderRadius: radius ?? theme.radii.sm,
    }),
    [width, height, radius, theme],
  );

  return <Animated.View style={[styles.base, base, { opacity }, style]} />;
}

const styles = StyleSheet.create({ base: {} });
