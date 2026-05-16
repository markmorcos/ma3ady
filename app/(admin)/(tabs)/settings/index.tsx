import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { ListItem } from '@/components/ListItem';
import { Text } from '@/components/Text';
import { BrandColorPicker } from '@/design/BrandColorPicker';
import { useTheme } from '@/design/ThemeProvider';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function AdminSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
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
  const [location, setLocation] = useState(tenant?.location ?? '');
  const [cancellationPolicy, setCancellationPolicy] = useState(
    tenant?.cancellation_policy ?? '',
  );
  const [brandColor, setBrandColor] = useState<string | null>(tenant?.brand_color ?? null);

  useEffect(() => {
    setName(tenant?.name ?? '');
    setLocation(tenant?.location ?? '');
    setCancellationPolicy(tenant?.cancellation_policy ?? '');
    setBrandColor(tenant?.brand_color ?? null);
  }, [
    tenant?.id,
    tenant?.name,
    tenant?.location,
    tenant?.cancellation_policy,
    tenant?.brand_color,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error('no tenant');
      const { error } = await supabase
        .from('tenants')
        .update({
          name: name.trim(),
          brand_color: brandColor,
          location: location.trim() || null,
          cancellation_policy: cancellationPolicy.trim() || null,
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
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Text variant="headlineSm" style={{ color: theme.colors.onSurface }}>
        {t('admin.tabs.settings')}
      </Text>

      <Section title={t('admin.settingsTenant')}>
        <Card kind="filled">
          <Input
            label={t('admin.settingsName')}
            value={name}
            onChangeText={setName}
            editable={canEdit}
          />
          <Input
            label={t('onboarding.locationLabel')}
            value={location}
            onChangeText={setLocation}
            placeholder={t('onboarding.locationPlaceholder')}
            editable={canEdit}
            maxLength={120}
          />
          <Input
            label={t('booking.policyTitle')}
            value={cancellationPolicy}
            onChangeText={setCancellationPolicy}
            editable={canEdit}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
          <View style={styles.brandColorBlock}>
            <Text variant="labelLg" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('admin.settingsBrandColor')}
            </Text>
            <BrandColorPicker
              value={brandColor}
              onChange={setBrandColor}
              disabled={!canEdit}
            />
          </View>
          <Text variant="bodySm" style={[styles.tzNote, { color: theme.colors.onSurfaceVariant }]}>
            {t('admin.settingsTenantTimezone')}: {tenant?.timezone ?? '—'}
          </Text>
          {canEdit && (
            <Button
              label={t('admin.settingsSave')}
              variant="filled"
              fullWidth
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
          )}
        </Card>
      </Section>

      <Section title={t('admin.settingsDisplay')}>
        <Card kind="filled" padded={false}>
          <ListItem
            leading={<Icon name="globe" size={20} color="onSurfaceVariant" />}
            headline={t('admin.settingsDisplayTimezone')}
            supporting={
              effectiveTz +
              (adminOverride
                ? ` · ${t('admin.tzBadgeOverride')}`
                : ` · ${t('admin.tzBadgeTenantDefault')}`)
            }
            trailing={<Icon name="chevron-right" size={20} color="onSurfaceVariant" />}
            onPress={() => router.push('/(admin)/(tabs)/settings/timezone')}
          />
          <ListItem
            leading={<Icon name="list-checks" size={20} color="onSurfaceVariant" />}
            headline={t('admin.settingsAuditLog')}
            trailing={<Icon name="chevron-right" size={20} color="onSurfaceVariant" />}
            onPress={() => router.push('/(admin)/(tabs)/audit-log')}
          />
          <ListItem
            leading={<Icon name="users" size={20} color="onSurfaceVariant" />}
            headline={t('admin.settingsSwitchTenant')}
            trailing={<Icon name="chevron-right" size={20} color="onSurfaceVariant" />}
            onPress={() => router.push('/(app)/tenants/picker')}
          />
        </Card>
      </Section>

      <Button
        label={t('admin.signOut')}
        variant="text"
        fullWidth
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text
        variant="labelLg"
        style={{
          color: theme.colors.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { gap: 8 },
  brandColorBlock: { gap: 8 },
  tzNote: { marginTop: 4 },
});
