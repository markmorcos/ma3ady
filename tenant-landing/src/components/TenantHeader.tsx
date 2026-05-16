import { type Tenant, type TenantType } from '@/lib/tenant';

type Props = {
  tenant: Tenant;
  /** Optional subtitle override; defaults to `<type> · <location?>`. */
  subtitle?: string;
};

const TYPE_LABEL_EN: Record<TenantType, string> = {
  generic: 'Business',
  salon: 'Salon',
  clinic: 'Clinic',
  auto: 'Auto',
};

const TYPE_LABEL_AR: Record<TenantType, string> = {
  generic: 'نشاط',
  salon: 'صالون',
  clinic: 'عيادة',
  auto: 'سيارات',
};

const TYPE_GLYPH: Record<TenantType, string> = {
  generic: '✦',
  salon: '✂',
  clinic: '✚',
  auto: '⚙',
};

/**
 * M3 tenant header for the public booking page. 56dp primary-container icon
 * tile carrying a type glyph + title-lg business name + body subtitle
 * ("Salon · Cairo · Zamalek").
 */
export function TenantHeader({ tenant, subtitle }: Props) {
  const labels = tenant.default_locale === 'ar' ? TYPE_LABEL_AR : TYPE_LABEL_EN;
  const typeLabel = labels[tenant.type];
  const subParts = [typeLabel, subtitle ?? tenant.location ?? null].filter(Boolean);
  const sub = subParts.join(' · ');
  return (
    <header className="tenant-header">
      <div className="avatar" aria-hidden>
        {TYPE_GLYPH[tenant.type]}
      </div>
      <div className="body">
        <p className="name">{tenant.name}</p>
        <p className="meta">{sub}</p>
      </div>
    </header>
  );
}
