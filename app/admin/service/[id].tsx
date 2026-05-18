import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { ServiceForm, type ServiceFormValues } from '@/features/admin/ServiceForm';
import { useTheme } from '@/design/ThemeProvider';
import { useThemedHeaderOptions } from '@/hooks/useThemedHeader';
import {
  deleteService,
  getService,
  setServiceActive,
  ServiceInUseError,
  upsertService,
} from '@/services/api/services';
import { isAdminRole, useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function EditServiceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const role = tenant?.role;
  const canEdit = isAdminRole(role);
  const showToast = useToastStore((s) => s.show);
  const [saving, setSaving] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => getService(id ?? ''),
    enabled: !!id,
  });

  const update = useMutation({
    mutationFn: (values: ServiceFormValues) => {
      if (!service) throw new Error('no service');
      return upsertService({ ...values, id: service.id, tenant_id: service.tenant_id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services', tenant?.id] });
      void queryClient.invalidateQueries({ queryKey: ['service', id] });
      showToast({ kind: 'success', message: t('admin.serviceSaved') });
      router.back();
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
    onSettled: () => setSaving(false),
  });

  const onSubmit = (values: ServiceFormValues) => {
    setSaving(true);
    update.mutate(values);
  };

  const remove = useMutation({
    mutationFn: async (svcId: string) => {
      await deleteService(svcId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.serviceDeleted') });
      router.back();
    },
    onError: (err) => {
      if (err instanceof ServiceInUseError) {
        Alert.alert(
          t('admin.serviceInUseTitle'),
          t('admin.serviceInUseBody'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('admin.serviceDeactivate'),
              style: 'destructive',
              onPress: async () => {
                if (!service) return;
                try {
                  await setServiceActive(service.id, false);
                  void queryClient.invalidateQueries({
                    queryKey: ['admin-services', tenant?.id],
                  });
                  showToast({ kind: 'success', message: t('admin.serviceDeactivated') });
                  router.back();
                } catch (innerErr) {
                  showToast({
                    kind: 'danger',
                    message:
                      innerErr instanceof Error ? innerErr.message : 'unknown',
                  });
                }
              },
            },
          ],
        );
      } else {
        showToast({
          kind: 'danger',
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    },
  });

  const onDelete = () => {
    if (!service) return;
    Alert.alert(t('admin.serviceDeleteTitle'), t('admin.serviceDeleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(service.id),
      },
    ]);
  };

  const headerTitle = service?.name ?? t('admin.serviceEdit');
  const headerOptions = useThemedHeaderOptions(headerTitle);

  if (isLoading || !service) {
    return (
      <>
        <Stack.Screen options={headerOptions} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <ServiceForm
        initial={service}
        saving={saving}
        submitLabel={t('admin.serviceSave')}
        onSubmit={onSubmit}
        footer={
          canEdit ? (
            <View style={styles.deleteWrap}>
              <Button
                label={t('admin.serviceDelete')}
                variant="danger"
                fullWidth
                loading={remove.isPending}
                onPress={onDelete}
              />
            </View>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  deleteWrap: { marginTop: 24 },
});
