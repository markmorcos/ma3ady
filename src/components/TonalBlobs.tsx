import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

type Props = {
  /** Opacity of each blob. Defaults to 0.9 (handoff value). */
  opacity?: number;
  /** Container style override. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Three decorative organic blobs absolutely positioned within the parent.
 * Rendered in `primaryContainer`, `tertiaryContainer`, `secondaryContainer`
 * to add a subtle brand-tonal texture behind hero copy. The parent MUST
 * be `overflow: hidden` and `position: relative`.
 */
export function TonalBlobs({ opacity = 0.9, style }: Props) {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      <View
        style={[
          styles.blob,
          {
            width: 220,
            height: 220,
            top: -60,
            insetInlineStart: -40,
            opacity,
            backgroundColor: theme.colors.primaryContainer,
            // Asymmetric corner radii produce the organic shape.
            borderTopStartRadius: 110,
            borderTopEndRadius: 88,
            borderBottomStartRadius: 96,
            borderBottomEndRadius: 132,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 180,
            height: 180,
            top: 40,
            insetInlineEnd: -50,
            opacity: opacity * 0.85,
            backgroundColor: theme.colors.tertiaryContainer,
            borderTopStartRadius: 90,
            borderTopEndRadius: 110,
            borderBottomStartRadius: 130,
            borderBottomEndRadius: 70,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 140,
            height: 140,
            bottom: -30,
            insetInlineStart: 60,
            opacity: opacity * 0.75,
            backgroundColor: theme.colors.secondaryContainer,
            borderTopStartRadius: 80,
            borderTopEndRadius: 64,
            borderBottomStartRadius: 76,
            borderBottomEndRadius: 90,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject },
  blob: { position: 'absolute' },
});
