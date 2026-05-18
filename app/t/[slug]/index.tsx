import { Redirect, useLocalSearchParams } from 'expo-router';

// Universal-link landing for `https://app.ma3ady.com/t/<slug>`. Funnels
// into the public booking flow at `(public)/[tenantSlug]`. Fires when
// the link is opened on a device with the app installed; otherwise the
// link loads in the browser at the same URL (the web build serves the
// same `(public)` RNW route).
export default function TenantSlugRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (!slug) return null;
  return <Redirect href={{ pathname: '/(public)/[tenantSlug]', params: { tenantSlug: slug } }} />;
}
