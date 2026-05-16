import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/design/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  /** Outer diameter of the circle. Defaults to 120dp. */
  size?: number;
  /** Stroke color of the check. Defaults to `onPrimaryContainer`. */
  color?: string;
  /** Background color of the circle. Defaults to `primaryContainer`. */
  background?: string;
};

const PATH_LENGTH = 30;

/**
 * The "joined" / "confirmation" success check used by onboarding and the
 * public booking confirmation hero. Implements the handoff's two-stage
 * animation: a 550ms pop on the circle (scale 0.4 → 1.08 → 1.0) followed
 * by a 450ms stroke-draw of the check path, after a 250ms delay.
 */
export function AnimatedCheck({ size = 120, color, background }: Props) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.onPrimaryContainer;
  const bg = background ?? theme.colors.primaryContainer;

  const scale = useSharedValue(0.4);
  const dashOffset = useSharedValue(PATH_LENGTH);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.08, {
        duration: 350,
        easing: Easing.bezier(0.2, 0.7, 0.3, 1.1),
      }),
      withTiming(1, { duration: 200, easing: Easing.bezier(0.2, 0, 0, 1) }),
    );
    dashOffset.value = withDelay(
      250,
      withTiming(0, { duration: 450, easing: Easing.bezier(0.2, 0, 0, 1) }),
    );
  }, [scale, dashOffset]);

  const innerSize = size * 0.73;
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={{ width: innerSize, height: innerSize }}>
        <Svg width={innerSize} height={innerSize} viewBox="0 0 24 24" fill="none">
          <AnimatedPath
            d="M5 12 l5 5 l9 -10"
            stroke={stroke}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PATH_LENGTH}
            animatedProps={animatedProps}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Silence "unused withSpring" import — kept for callers extending the animation.
void withSpring;
