import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { ServiceForm, type ServiceFormValues } from '@/features/admin/ServiceForm';
import { useTheme } from '@/design/ThemeProvider';
import { getService, upsertService } from '@/services/api/services';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function EditServiceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
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

  if (isLoading || !service) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: t('admin.serviceEdit') }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand[500]} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: service.name }} />
      <ServiceForm
        initial={service}
        saving={saving}
        submitLabel={t('admin.serviceSave')}
        onSubmit={onSubmit}
      />
    </>
  );
}
