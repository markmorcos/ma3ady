// Web stub for the mobile push-token registration. No-ops on the web
// platform; real Web Push (Service Worker + Web Push API) ships in a
// separate change. The signatures match the native impl so the shared
// callers can invoke without a Platform.OS branch.

export async function registerForPush(): Promise<string | null> {
  return null;
}

export async function deactivatePushToken(_token: string | null): Promise<void> {
  // no-op
}
