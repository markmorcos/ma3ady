// Named aliases over the auto-generated `database.ts`. Regeneration via
// `pnpm exec supabase gen types typescript --local 2>/dev/null > src/types/database.ts`
// overwrites database.ts; this sidecar file is hand-maintained and stable.
import type { Database } from './database';

export type TenantRole = Database['public']['Enums']['tenant_role'];

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Membership = Database['public']['Tables']['memberships']['Row'];
export type MembershipInsert = Database['public']['Tables']['memberships']['Insert'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Subset of tenant columns readable by anonymous clients (per RLS policy).
export type TenantPublic = Pick<
  Tenant,
  'id' | 'slug' | 'name' | 'timezone' | 'default_locale' | 'brand_color'
>;

export type AvailabilityRule = Database['public']['Tables']['availability_rules']['Row'];
export type AvailabilityRuleInsert =
  Database['public']['Tables']['availability_rules']['Insert'];

export type AvailabilityException =
  Database['public']['Tables']['availability_exceptions']['Row'];
export type AvailabilityExceptionInsert =
  Database['public']['Tables']['availability_exceptions']['Insert'];

export type AvailabilityExceptionKind = Database['public']['Enums']['availability_exception_kind'];

export type AvailableSlot = {
  starts_at: string;
  ends_at: string;
};

export type Service = Database['public']['Tables']['services']['Row'];
export type ServiceInsert = Database['public']['Tables']['services']['Insert'];

export type GuestContact = Database['public']['Tables']['guest_contacts']['Row'];

export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];

export type AppointmentEvent = Database['public']['Tables']['appointment_events']['Row'];

export type BookingResult = {
  appointment_id: string;
  manage_token: string;
};

export type TenantAuditEvent = Database['public']['Tables']['tenant_audit_events']['Row'];
export type TenantAuditEventKind = Database['public']['Enums']['tenant_audit_event_kind'];
export type TenantAuditActorKind = Database['public']['Enums']['tenant_audit_actor_kind'];

export type PendingMembership = Database['public']['Tables']['pending_memberships']['Row'];

export type SlugAvailability = {
  available: boolean;
  reason: 'invalid' | 'reserved' | 'taken' | null;
};
