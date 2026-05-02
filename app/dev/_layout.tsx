import { Stack, Redirect } from 'expo-router';

const DEV_TOOLS_ENABLED = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';

export default function DevLayout() {
  if (!DEV_TOOLS_ENABLED) {
    return <Redirect href="/+not-found" />;
  }
  return <Stack />;
}
