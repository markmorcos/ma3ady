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
  /** ISO-like local string `YYYY-MM-DDTHH:MM` (no timezone). */
  value: string;
  onChange: (next: string) => void;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parse(value: string): Date {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date();
  const [, y, mo, d, h, mi] = m;
  return new Date(
    parseInt(y!, 10),
    parseInt(mo!, 10) - 1,
    parseInt(d!, 10),
    parseInt(h!, 10),
    parseInt(mi!, 10),
    0,
    0,
  );
}

function display(value: string): string {
  const date = parse(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function DateTimeField({ label, value, onChange }: Props) {
  const theme = useTheme();
  const [iosVisible, setIosVisible] = useState<'date' | 'time' | null>(null);
  const [iosDraft, setIosDraft] = useState<Date>(parse(value));

  const openAndroid = () => {
    const d = parse(value);
    DateTimePickerAndroid.open({
      value: d,
      mode: 'date',
      onChange: (_e: DateTimePickerEvent, selectedDate?: Date) => {
        if (!selectedDate) return;
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          is24Hour: true,
          onChange: (_e2: DateTimePickerEvent, selectedTime?: Date) => {
            if (!selectedTime) return;
            const merged = new Date(selectedDate);
            merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onChange(toLocalInput(merged));
          },
        });
      },
    });
  };

  const open = () => {
    if (Platform.OS === 'android') openAndroid();
    else {
      setIosDraft(parse(value));
      setIosVisible('date');
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
        <Text variant="body">{display(value)}</Text>
      </Pressable>

      {Platform.OS === 'ios' && iosVisible !== null && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
              <DateTimePicker
                value={iosDraft}
                mode={iosVisible}
                display="spinner"
                onChange={(_e, selected) => {
                  if (!selected) return;
                  setIosDraft(selected);
                }}
              />
              <Button
                label={iosVisible === 'date' ? 'Next' : 'Done'}
                variant="primary"
                onPress={() => {
                  if (iosVisible === 'date') {
                    setIosVisible('time');
                  } else {
                    onChange(toLocalInput(iosDraft));
                    setIosVisible(null);
                  }
                }}
              />
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
