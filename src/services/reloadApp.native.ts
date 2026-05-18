import * as Updates from 'expo-updates';

// In production we use OTA's reloadAsync; in Expo Go / dev that throws,
// which the caller treats as a no-op (the dev menu offers its own reload).
export async function reloadApp(): Promise<void> {
  await Updates.reloadAsync();
}
