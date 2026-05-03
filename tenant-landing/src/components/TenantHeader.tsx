import { type Tenant } from '@/lib/tenant';

type Props = {
  tenant: Tenant;
  subtitle?: string;
};

export function TenantHeader({ tenant, subtitle }: Props) {
  const brand = tenant.brand_color ?? 'var(--brand)';
  return (
    <header className="tenant-header" style={{ borderInlineStartColor: brand }}>
      <h1>{tenant.name}</h1>
      <span className="meta">{subtitle ?? tenant.timezone}</span>
    </header>
  );
}
