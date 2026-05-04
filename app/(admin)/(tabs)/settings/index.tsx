import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function AdminSettingsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const refreshTenants = useTenantStore((s) => s.refresh);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const showToast = useToastStore((s) => s.show);

  const adminOverride = profile?.display_timezone_override ?? null;
  const effectiveTz = adminOverride ?? tenant?.timezone ?? '—';

  const [name, setName] = useState(tenant?.name ?? '');
  const [brandColor, setBrandColor] = useState(tenant?.brand_color ?? '');

  useEffect(() => {
    setName(tenant?.name ?? '');
    setBrandColor(tenant?.brand_color ?? '');
  }, [tenant?.id, tenant?.name, tenant?.brand_color]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error('no tenant');
      const { error } = await supabase
        .from('tenants')
        .update({
          name: name.trim(),
          brand_color: brandColor.trim() || null,
        })
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void refreshTenants();
      void queryClient.invalidateQueries({ queryKey: ['tenant', tenant?.slug] });
      void queryClient.invalidateQueries({ queryKey: ['tenant-by-id', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.settingsSaved') });
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  const role = tenant?.role;
  const canEdit = role === 'owner' || role === 'admin';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h2">{t('admin.tabs.settings')}</Text>

      <Card>
        <Text variant="bodyStrong">{t('admin.settingsTenant')}</Text>
        <Input
          label={t('admin.settingsName')}
          value={name}
          onChangeText={setName}
          editable={canEdit}
        />
        <Input
          label={t('admin.settingsBrandColor')}
          value={brandColor}
          onChangeText={setBrandColor}
          placeholder={t('admin.settingsBrandColorHint')}
          editable={canEdit}
          autoCapitalize="none"
        />
        <Text variant="caption" color="muted" style={styles.row}>
          {t('admin.settingsTenantTimezone')}: {tenant?.timezone ?? '—'}
        </Text>
        {canEdit && (
          <Button
            label={t('admin.settingsSave')}
            variant="primary"
            fullWidth
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        )}
      </Card>

      <Card>
        <Text variant="bodyStrong">{t('admin.settingsDisplay')}</Text>
        <Pressable
          onPress={() => router.push('/(admin)/(tabs)/settings/timezone')}
          accessibilityRole="button"
          style={styles.linkRow}
        >
          <View style={styles.flex}>
            <Text variant="body">{t('admin.settingsDisplayTimezone')}</Text>
            <Text variant="caption" color="muted">
              {effectiveTz}
              {adminOverride
                ? ` · ${t('admin.tzBadgeOverride')}`
                : ` · ${t('admin.tzBadgeTenantDefault')}`}
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color="muted" />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(admin)/(tabs)/audit-log')}
          accessibilityRole="button"
          style={styles.linkRow}
        >
          <Text variant="body">{t('admin.settingsAuditLog')}</Text>
          <Icon name="chevron-right" size={18} color="muted" />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/tenants/picker')}
          accessibilityRole="button"
          style={styles.linkRow}
        >
          <Text variant="body">{t('admin.settingsSwitchTenant')}</Text>
          <Icon name="chevron-right" size={18} color="muted" />
        </Pressable>
      </Card>

      <Button
        label={t('admin.signOut')}
        variant="ghost"
        fullWidth
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  flex: { flex: 1 },
  row: { marginTop: 4 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});
