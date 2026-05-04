import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServiceForm, type ServiceFormValues } from '@/features/admin/ServiceForm';
import { useThemedHeaderOptions } from '@/hooks/useThemedHeader';
import { upsertService } from '@/services/api/services';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';

export default function NewServiceScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const showToast = useToastStore((s) => s.show);
  const headerOptions = useThemedHeaderOptions(t('admin.serviceCreate'));
  const [saving, setSaving] = useState(false);

  const create = useMutation({
    mutationFn: (values: ServiceFormValues) => {
      if (!tenant) throw new Error('no tenant');
      return upsertService({ ...values, tenant_id: tenant.id, active: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-services', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.serviceCreated') });
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
    create.mutate(values);
  };

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <ServiceForm
        saving={saving}
        submitLabel={t('admin.serviceCreate')}
        onSubmit={onSubmit}
      />
    </>
  );
}
