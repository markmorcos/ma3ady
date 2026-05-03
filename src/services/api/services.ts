import { supabase } from './supabase';
import { type Service } from '@/types/db';

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

export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
