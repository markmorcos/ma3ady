import { supabase } from './supabase';
import { type Appointment } from '@/types/db';

export type MyAppointment = Appointment & {
  service: { id: string; name: string; duration_minutes: number } | null;
  tenant: { id: string; slug: string; name: string; timezone: string } | null;
};

export async function getMyAppointments(): Promise<MyAppointment[]> {
  // RLS scopes to user_id = auth.uid() OR same-tenant staff. For a customer,
  // that returns only their own appointments. Embed the service + tenant
  // names so the customer home / bookings list can render without a second
  // round-trip.
  const { data, error } = await supabase
    .from('appointments')
    .select(
      '*, service:services(id, name, duration_minutes), tenant:tenants(id, slug, name, timezone)',
    )
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MyAppointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function rescheduleAppointmentAuthed(
  appointmentId: string,
  newStartsAt: Date | string,
): Promise<Appointment> {
  const startsAt =
    typeof newStartsAt === 'string' ? newStartsAt : newStartsAt.toISOString();
  const { data, error } = await supabase.functions.invoke<{
    appointment?: Appointment;
    error?: string;
  }>('reschedule-appointment', {
    body: { appointment_id: appointmentId, new_starts_at: startsAt },
  });
  if (error) throw error;
  if (!data?.appointment) throw new Error('reschedule-appointment returned no row');
  return data.appointment;
}
