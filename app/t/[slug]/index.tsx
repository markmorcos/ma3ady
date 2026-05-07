import { Redirect, useLocalSearchParams } from 'expo-router';

// Universal-link landing for `https://ma3ady.com/t/<slug>`. Funnels into the
// public booking flow at `(public)/[tenantSlug]`. The web tenant-landing site
// renders its own UI for the same path; this route only fires when the link
// is opened on a device with the app installed.
export default function TenantSlugRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (!slug) return null;
  return <Redirect href={{ pathname: '/(public)/[tenantSlug]', params: { tenantSlug: slug } }} />;
}
