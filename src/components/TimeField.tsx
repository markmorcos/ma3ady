import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/design/ThemeProvider';
import { overlay } from '@/design/tokens';

type Props = {
  label: string;
  /** "HH:MM" (24h). */
  value: string;
  onChange: (next: string) => void;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parse(value: string): Date {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? (h as number) : 9, Number.isFinite(m) ? (m as number) : 0, 0, 0);
  return d;
}

export function TimeField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [iosVisible, setIosVisible] = useState(false);

  const open = () => {
    const date = parse(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        is24Hour: true,
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (!selected) return;
          onChange(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
        },
      });
    } else {
      setIosVisible(true);
    }
  };

  return (
    <View style={styles.field}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={open}
        style={[
          styles.fakeInput,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="body">{value}</Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={iosVisible} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
              <DateTimePicker
                value={parse(value)}
                mode="time"
                display="spinner"
                onChange={(_e, selected) => {
                  if (!selected) return;
                  onChange(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
                }}
              />
              <Button label="Done" variant="primary" onPress={() => setIosVisible(false)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 4 },
  fakeInput: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    padding: 16,
    gap: 12,
    borderTopStartRadius: 24,
    borderTopEndRadius: 24,
  },
});
