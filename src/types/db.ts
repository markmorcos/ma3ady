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
