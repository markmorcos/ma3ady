import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { type Service } from '@/types/db';

export type ServiceFormValues = {
  name: string;
  description: string;
  duration_minutes: number;
  buffer_before_min: number;
  buffer_after_min: number;
  min_notice_min: number;
  max_advance_days: number;
  daily_cap: number | null;
};

type Props = {
  initial?: Service;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: ServiceFormValues) => void;
  /** Optional content rendered below the submit button (e.g. delete CTA). */
  footer?: React.ReactNode;
};

const empty: ServiceFormValues = {
  name: '',
  description: '',
  duration_minutes: 30,
  buffer_before_min: 0,
  buffer_after_min: 0,
  min_notice_min: 60,
  max_advance_days: 30,
  daily_cap: null,
};

function num(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function ServiceForm({ initial, saving, submitLabel, onSubmit, footer }: Props) {
  const { t } = useTranslation();
  const [v, setV] = useState<ServiceFormValues>(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          duration_minutes: initial.duration_minutes,
          buffer_before_min: initial.buffer_before_min,
          buffer_after_min: initial.buffer_after_min,
          min_notice_min: initial.min_notice_min,
          max_advance_days: initial.max_advance_days,
          daily_cap: initial.daily_cap,
        }
      : empty,
  );

  const canSubmit = v.name.trim().length > 0 && v.duration_minutes > 0;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Input
        label={t('admin.serviceForm.name')}
        value={v.name}
        onChangeText={(name) => setV({ ...v, name })}
      />
      <Input
        label={t('admin.serviceForm.description')}
        value={v.description}
        onChangeText={(description) => setV({ ...v, description })}
        multiline
        numberOfLines={3}
      />
      <View style={styles.row}>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.durationMin')}
            value={String(v.duration_minutes)}
            keyboardType="number-pad"
            onChangeText={(s) => setV({ ...v, duration_minutes: num(s, v.duration_minutes) })}
          />
        </View>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.dailyCap')}
            value={v.daily_cap == null ? '' : String(v.daily_cap)}
            keyboardType="number-pad"
            onChangeText={(s) =>
              setV({ ...v, daily_cap: s.trim() === '' ? null : num(s, 0) })
            }
            placeholder={t('admin.serviceForm.dailyCapHint')}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.bufferBefore')}
            value={String(v.buffer_before_min)}
            keyboardType="number-pad"
            onChangeText={(s) => setV({ ...v, buffer_before_min: num(s, 0) })}
          />
        </View>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.bufferAfter')}
            value={String(v.buffer_after_min)}
            keyboardType="number-pad"
            onChangeText={(s) => setV({ ...v, buffer_after_min: num(s, 0) })}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.minNotice')}
            value={String(v.min_notice_min)}
            keyboardType="number-pad"
            onChangeText={(s) => setV({ ...v, min_notice_min: num(s, 0) })}
          />
        </View>
        <View style={styles.cell}>
          <Input
            label={t('admin.serviceForm.maxAdvance')}
            value={String(v.max_advance_days)}
            keyboardType="number-pad"
            onChangeText={(s) => setV({ ...v, max_advance_days: num(s, 0) })}
          />
        </View>
      </View>

      <Button
        label={submitLabel}
        variant="primary"
        fullWidth
        loading={saving}
        disabled={!canSubmit || saving}
        onPress={() => onSubmit(v)}
      />
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
});
