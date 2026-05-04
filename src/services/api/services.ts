import { supabase } from './supabase';
import { type Service, type ServiceInsert } from '@/types/db';

export async function getActiveServices(tenantSlug: string): Promise<Service[]> {
  // RLS allows anon to see active rows; we still filter explicitly so that
  // tenant members (who can also see inactive ones) get the public view here.
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) return [];

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getAllServices(tenantId: string): Promise<Service[]> {
  // Admin view: includes inactive services. RLS allows tenant members to read.
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setServiceActive(id: string, active: boolean): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({ active })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export class ServiceInUseError extends Error {
  constructor() {
    super('service_in_use');
    this.name = 'ServiceInUseError';
  }
}

/**
 * Hard-deletes a service. Throws ServiceInUseError when at least one
 * appointment references the service (the FK is `on delete restrict`); the
 * caller's expected fallback is to deactivate instead.
 */
export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) {
    // Postgres foreign-key violation surfaces as code 23503.
    if (error.code === '23503' || error.message?.includes('foreign key')) {
      throw new ServiceInUseError();
    }
    throw error;
  }
}

export async function upsertService(
  service: ServiceInsert & { id?: string },
): Promise<Service> {
  if (service.id) {
    const { id, ...rest } = service;
    const { data, error } = await supabase
      .from('services')
      .update(rest)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('services')
    .insert(service)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
