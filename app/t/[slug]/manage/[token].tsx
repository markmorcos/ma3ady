import { Redirect, useLocalSearchParams } from 'expo-router';

// Universal-link landing for `https://ma3ady.com/t/<slug>/manage/<token>`.
// Slug is informational only — the manage flow keys off the token alone.
export default function TenantManageRedirect() {
  const { token } = useLocalSearchParams<{ token: string }>();
  if (!token) return null;
  return <Redirect href={{ pathname: '/manage/[token]', params: { token } }} />;
}
