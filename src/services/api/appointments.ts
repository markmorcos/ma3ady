import { supabase } from './supabase';
import { type Appointment } from '@/types/db';

export async function getMyAppointments(): Promise<Appointment[]> {
  // RLS scopes to user_id = auth.uid() OR same-tenant staff. For a customer,
  // that returns only their own appointments.
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
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
