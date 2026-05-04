import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { Time } from '@/components/Time';
import { useTheme } from '@/design/ThemeProvider';
import { overlay } from '@/design/tokens';
import {
  bulkReplaceRulesForDay,
  deleteException,
  getExceptionsForTenant,
  getRulesForTenant,
  upsertException,
  type AvailabilityException,
  type AvailabilityExceptionKind,
  type Band,
} from '@/services/api/availability';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

const DAY_KEYS = [
  'admin.day.mon',
  'admin.day.tue',
  'admin.day.wed',
  'admin.day.thu',
  'admin.day.fri',
  'admin.day.sat',
  'admin.day.sun',
] as const;

// Postgres `day_of_week` is 0=Sun..6=Sat. Our UI lists Mon-first.
const UI_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

const TEMPLATE_BANDS: Band[] = [{ start_time: '09:00:00', end_time: '17:00:00' }];

function formatBand(b: Band): string {
  return `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`;
}

function toLocalInput(d: Date): string {
  // Format as YYYY-MM-DDTHH:MM in local time for the datetime-style picker.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AvailabilityScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const role = tenant?.role;
  const canEdit = role === 'owner' || role === 'admin';
  const showToast = useToastStore((s) => s.show);

  const [editing, setEditing] = useState<{
    dayIndex: number;
    bands: Band[];
  } | null>(null);
  const [exceptionDraft, setExceptionDraft] = useState<{
    id?: string;
    kind: AvailabilityExceptionKind;
    starts_at: string;
    ends_at: string;
    reason: string;
  } | null>(null);

  const rules = useQuery({
    queryKey: ['admin-rules', tenant?.id],
    queryFn: () => getRulesForTenant(tenant?.id ?? ''),
    enabled: !!tenant?.id,
  });
  const exceptions = useQuery({
    queryKey: ['admin-exceptions', tenant?.id],
    queryFn: () => getExceptionsForTenant(tenant?.id ?? ''),
    enabled: !!tenant?.id,
  });

  const bandsByDay = useMemo(() => {
    const m = new Map<number, Band[]>();
    for (let i = 0; i < 7; i++) m.set(i, []);
    for (const r of rules.data ?? []) {
      const arr = m.get(r.day_of_week) ?? [];
      arr.push({ start_time: r.start_time, end_time: r.end_time });
      m.set(r.day_of_week, arr);
    }
    return m;
  }, [rules.data]);

  const replace = useMutation({
    mutationFn: ({ dow, bands }: { dow: number; bands: Band[] }) =>
      bulkReplaceRulesForDay(tenant?.id ?? '', dow, bands),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-rules', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.rulesSaved') });
      setEditing(null);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'unknown';
      showToast({
        kind: 'danger',
        message: msg.includes('forbidden') ? t('admin.rulesForbidden') : msg,
      });
    },
  });

  const saveException = useMutation({
    mutationFn: async (input: typeof exceptionDraft) => {
      if (!tenant || !input) throw new Error('no tenant');
      return upsertException({
        id: input.id,
        tenant_id: tenant.id,
        service_id: null,
        kind: input.kind,
        starts_at: new Date(input.starts_at).toISOString(),
        ends_at: new Date(input.ends_at).toISOString(),
        reason: input.reason.trim() || null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exceptions', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.exceptionSaved') });
      setExceptionDraft(null);
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  const removeException = useMutation({
    mutationFn: (id: string) => deleteException(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-exceptions', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.exceptionDeleted') });
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  const openNewException = (kind: AvailabilityExceptionKind) => {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 60 * 60_000);
    setExceptionDraft({
      kind,
      starts_at: toLocalInput(start),
      ends_at: toLocalInput(end),
      reason: '',
    });
  };

  const seedTemplate = async () => {
    if (!tenant) return;
    for (const ui of [0, 1, 2, 3, 4]) {
      await bulkReplaceRulesForDay(tenant.id, UI_TO_DOW[ui]!, TEMPLATE_BANDS);
    }
    void queryClient.invalidateQueries({ queryKey: ['admin-rules', tenant?.id] });
    showToast({ kind: 'success', message: t('admin.rulesTemplateApplied') });
  };

  if (!tenant) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-triangle" title={t('admin.noTenantSelected')} />
      </View>
    );
  }

  if (rules.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  const totalBands = (rules.data ?? []).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h2">{t('admin.availabilityTitle')}</Text>
      <Text variant="caption" color="muted">
        {t('admin.availabilitySubtitle', { tz: tenant.timezone })}
      </Text>

      {totalBands === 0 ? (
        <Card>
          <Text variant="bodyStrong">{t('admin.rulesEmptyTitle')}</Text>
          <Text variant="caption" color="muted">
            {t('admin.rulesEmptyBody')}
          </Text>
          {canEdit && (
            <Button
              label={t('admin.rulesApplyTemplate')}
              variant="primary"
              fullWidth
              onPress={seedTemplate}
            />
          )}
        </Card>
      ) : null}

      {[0, 1, 2, 3, 4, 5, 6].map((uiIndex) => {
        const dow = UI_TO_DOW[uiIndex]!;
        const bands = bandsByDay.get(dow) ?? [];
        return (
          <Card key={uiIndex}>
            <View style={styles.dayHeader}>
              <Text variant="bodyStrong">{t(DAY_KEYS[uiIndex]!)}</Text>
              {canEdit && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEditing({ dayIndex: uiIndex, bands })}
                  hitSlop={8}
                >
                  <Icon name="plus" size={18} color="brand.500" />
                </Pressable>
              )}
            </View>
            {bands.length === 0 ? (
              <Text variant="caption" color="muted" style={styles.row}>
                {t('admin.dayClosed')}
              </Text>
            ) : (
              <View style={styles.bandRow}>
                {bands.map((b, idx) => (
                  <View
                    key={`${b.start_time}-${b.end_time}-${idx}`}
                    style={[
                      styles.bandChip,
                      {
                        backgroundColor: theme.colors.brandTint,
                        borderColor: theme.colors.brand[500],
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ color: theme.colors.brand[500] }}>
                      {formatBand(b)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}

      <Text variant="bodyStrong" style={styles.heading}>
        {t('admin.exceptionsHeading')}
      </Text>
      {canEdit && (
        <View style={styles.exceptionCtas}>
          <Button
            label={t('admin.exceptionAddBlock')}
            variant="secondary"
            onPress={() => openNewException('block')}
          />
          <Button
            label={t('admin.exceptionAddExtra')}
            variant="ghost"
            onPress={() => openNewException('extra')}
          />
        </View>
      )}
      {(exceptions.data ?? []).length === 0 ? (
        <Card>
          <Text variant="caption" color="muted">
            {t('admin.exceptionsEmpty')}
          </Text>
        </Card>
      ) : (
        (exceptions.data ?? []).map((e: AvailabilityException) => (
          <Card key={e.id}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">
                  {t(`admin.exceptionKind.${e.kind}`)}
                </Text>
                <View style={styles.exceptionTimes}>
                  <Time
                    value={e.starts_at}
                    context="admin"
                    tenantTimezone={tenant.timezone}
                    format="datetime"
                  />
                  <Text variant="caption" color="muted">
                    {' → '}
                  </Text>
                  <Time
                    value={e.ends_at}
                    context="admin"
                    tenantTimezone={tenant.timezone}
                    format="datetime"
                  />
                </View>
                {e.reason ? (
                  <Text variant="caption" color="muted">
                    {e.reason}
                  </Text>
                ) : null}
              </View>
              {canEdit && (
                <View style={styles.exceptionActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    onPress={() => removeException.mutate(e.id)}
                    hitSlop={8}
                  >
                    <Icon name="trash" size={18} color="danger" />
                  </Pressable>
                </View>
              )}
            </View>
          </Card>
        ))
      )}

      {exceptionDraft && (
        <ExceptionEditorModal
          draft={exceptionDraft}
          saving={saveException.isPending}
          onCancel={() => setExceptionDraft(null)}
          onChange={(next) => setExceptionDraft(next)}
          onSave={() => saveException.mutate(exceptionDraft)}
        />
      )}

      {editing && (
        <BandEditorModal
          dayLabel={t(DAY_KEYS[editing.dayIndex]!)}
          bands={editing.bands}
          saving={replace.isPending}
          onCancel={() => setEditing(null)}
          onSave={(bands) =>
            replace.mutate({ dow: UI_TO_DOW[editing.dayIndex]!, bands })
          }
        />
      )}
    </ScrollView>
  );
}

function normaliseTime(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}

function BandEditorModal({
  dayLabel,
  bands,
  saving,
  onCancel,
  onSave,
}: {
  dayLabel: string;
  bands: Band[];
  saving: boolean;
  onCancel: () => void;
  onSave: (bands: Band[]) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [draft, setDraft] = useState<{ start: string; end: string }[]>(() =>
    bands.length === 0
      ? [{ start: '09:00', end: '17:00' }]
      : bands.map((b) => ({ start: b.start_time.slice(0, 5), end: b.end_time.slice(0, 5) })),
  );

  const handleSave = () => {
    const out: Band[] = [];
    for (const d of draft) {
      const s = normaliseTime(d.start);
      const e = normaliseTime(d.end);
      if (!s || !e || e <= s) {
        return;
      }
      out.push({ start_time: s, end_time: e });
    }
    onSave(out);
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="h3">{dayLabel}</Text>
          <Text variant="caption" color="muted">
            {t('admin.bandHint')}
          </Text>
          {draft.map((d, idx) => (
            <View key={idx} style={styles.bandEditRow}>
              <View style={styles.flex}>
                <Input
                  label={t('admin.bandStart')}
                  value={d.start}
                  onChangeText={(v) =>
                    setDraft((arr) => arr.map((b, i) => (i === idx ? { ...b, start: v } : b)))
                  }
                  placeholder="09:00"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.flex}>
                <Input
                  label={t('admin.bandEnd')}
                  value={d.end}
                  onChangeText={(v) =>
                    setDraft((arr) => arr.map((b, i) => (i === idx ? { ...b, end: v } : b)))
                  }
                  placeholder="17:00"
                  autoCapitalize="none"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                onPress={() => setDraft((arr) => arr.filter((_, i) => i !== idx))}
                hitSlop={8}
                style={styles.deleteBtn}
              >
                <Icon name="trash" size={18} color="danger" />
              </Pressable>
            </View>
          ))}
          <Button
            label={t('admin.bandAdd')}
            variant="ghost"
            onPress={() => setDraft((arr) => [...arr, { start: '09:00', end: '17:00' }])}
          />
          <View style={styles.modalActions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
            <Button
              label={t('common.save')}
              variant="primary"
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ExceptionDraft = {
  id?: string;
  kind: AvailabilityExceptionKind;
  starts_at: string;
  ends_at: string;
  reason: string;
};

function ExceptionEditorModal({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ExceptionDraft;
  saving: boolean;
  onChange: (next: ExceptionDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const valid =
    !!draft.starts_at &&
    !!draft.ends_at &&
    new Date(draft.ends_at).getTime() > new Date(draft.starts_at).getTime();
  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          <Text variant="h3">
            {draft.kind === 'block'
              ? t('admin.exceptionAddBlock')
              : t('admin.exceptionAddExtra')}
          </Text>
          <Text variant="caption" color="muted">
            {t('admin.exceptionHint')}
          </Text>
          <Input
            label={t('admin.exceptionStart')}
            value={draft.starts_at}
            onChangeText={(starts_at) => onChange({ ...draft, starts_at })}
            placeholder="2026-12-25T09:00"
            autoCapitalize="none"
          />
          <Input
            label={t('admin.exceptionEnd')}
            value={draft.ends_at}
            onChangeText={(ends_at) => onChange({ ...draft, ends_at })}
            placeholder="2026-12-26T17:00"
            autoCapitalize="none"
          />
          <Input
            label={t('admin.exceptionReason')}
            value={draft.reason}
            onChangeText={(reason) => onChange({ ...draft, reason })}
            placeholder={t('admin.exceptionReasonHint')}
          />
          <View style={styles.modalActions}>
            <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} />
            <Button
              label={t('common.save')}
              variant="primary"
              loading={saving}
              disabled={!valid}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  row: { marginTop: 4 },
  exceptionTimes: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  exceptionCtas: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exceptionActions: { flexDirection: 'row', alignItems: 'flex-start', padding: 4 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bandChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  bandEditRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  deleteBtn: { padding: 12 },
  heading: { marginTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'flex-end',
  },
  modal: { padding: 24, gap: 12, borderTopStartRadius: 24, borderTopEndRadius: 24 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
});
