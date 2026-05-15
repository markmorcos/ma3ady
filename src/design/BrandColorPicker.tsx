import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { brandSwatches } from '@/design/colors';
import { useTheme } from '@/design/ThemeProvider';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

function isSwatch(value: string | null): boolean {
  return !!value && (brandSwatches as readonly string[]).includes(value);
}

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  customLabel?: string;
};

export function BrandColorPicker({ value, onChange, disabled, customLabel }: Props) {
  const theme = useTheme();
  const startsCustom = !!value && !isSwatch(value);
  const [customMode, setCustomMode] = useState<boolean>(startsCustom);
  const [customDraft, setCustomDraft] = useState<string>(
    startsCustom ? (value as string) : '',
  );

  const applyCustom = (next: string) => {
    setCustomDraft(next);
    if (next === '') {
      onChange(null);
      return;
    }
    if (isValidHex(next)) onChange(next);
  };

  const toggleCustom = () => {
    if (customMode) {
      setCustomMode(false);
      // If the active value was a custom hex (not in swatches), clear it.
      if (value && !isSwatch(value)) onChange(null);
      setCustomDraft('');
    } else {
      setCustomMode(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.swatches}>
        {brandSwatches.map((c) => {
          const selected = !customMode && value === c;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => {
                setCustomMode(false);
                setCustomDraft('');
                onChange(value === c ? null : c);
              }}
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderColor: selected ? theme.colors.text : 'transparent',
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            />
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Custom color"
          disabled={disabled}
          onPress={toggleCustom}
          style={[
            styles.swatch,
            styles.customToggle,
            {
              borderColor: customMode ? theme.colors.text : theme.colors.border,
              opacity: disabled ? 0.5 : 1,
              backgroundColor:
                customMode && value && !isSwatch(value) ? value : 'transparent',
            },
          ]}
        >
          {!(customMode && value && !isSwatch(value)) && (
            <Text variant="caption" color="muted">
              +
            </Text>
          )}
        </Pressable>
      </View>

      {customMode && (
        <Input
          label={customLabel ?? '#RRGGBB'}
          value={customDraft}
          onChangeText={applyCustom}
          editable={!disabled}
          autoCapitalize="characters"
          maxLength={7}
          placeholder="#0F766E"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  customToggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
