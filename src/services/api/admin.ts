import { supabase } from './supabase';
import { type Appointment, type AppointmentStatus } from '@/types/db';

export type AdminAppointment = Appointment & {
  guest_contact: { name: string; email: string; phone: string | null } | null;
  service: { id: string; name: string; duration_minutes: number } | null;
};

export type TenantStats = {
  todayCount: number;
  weekConfirmed: number;
  noShowRate: number;
};

const ADMIN_APPT_SELECT =
  '*, guest_contact:guest_contacts(name, email, phone), service:services(id, name, duration_minutes)';

export async function getTodayAppointments(
  tenantId: string,
  tenantTimezone: string,
): Promise<AdminAppointment[]> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tenantTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(new Date());
  const from = new Date(`${today}T00:00:00`);
  const to = new Date(`${today}T00:00:00`);
  to.setDate(to.getDate() + 1);

  const { data, error } = await supabase
    .from('appointments')
    .select(ADMIN_APPT_SELECT)
    .eq('tenant_id', tenantId)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminAppointment[];
}

export async function getUpcomingAppointments(
  tenantId: string,
  days = 30,
): Promise<AdminAppointment[]> {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + days);

  const { data, error } = await supabase
    .from('appointments')
    .select(ADMIN_APPT_SELECT)
    .eq('tenant_id', tenantId)
    .gte('starts_at', now.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminAppointment[];
}

export async function getAppointmentDetail(id: string): Promise<AdminAppointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(ADMIN_APPT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AdminAppointment) ?? null;
}

export async function getTenantStats(
  tenantId: string,
  tenantTimezone: string,
): Promise<TenantStats> {
  const today = await getTodayAppointments(tenantId, tenantTimezone);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { count: weekConfirmed } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'completed'])
    .gte('starts_at', weekStart.toISOString())
    .lt('starts_at', weekEnd.toISOString());

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const { data: completed } = await supabase
    .from('appointments')
    .select('status')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'no_show'])
    .gte('starts_at', monthAgo.toISOString())
    .lt('starts_at', now.toISOString());
  const total = completed?.length ?? 0;
  const noShows = completed?.filter((a) => a.status === 'no_show').length ?? 0;
  const noShowRate = total > 0 ? noShows / total : 0;

  return {
    todayCount: today.length,
    weekConfirmed: weekConfirmed ?? 0,
    noShowRate,
  };
}

export async function getAppointmentEvents(appointmentId: string) {
  const { data, error } = await supabase
    .from('appointment_events')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  const { data, error } = await supabase.functions.invoke<{
    appointment?: Appointment;
    error?: string;
  }>('update-appointment-status', {
    body: { appointment_id: appointmentId, status },
  });
  if (error) throw error;
  if (!data?.appointment)
    throw new Error('update-appointment-status returned no appointment');
  return data.appointment;
}
