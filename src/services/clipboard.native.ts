import * as Clipboard from 'expo-clipboard';

export async function copyToClipboard(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
}
