// Mobile-side push registration. Idempotently upserts (user_id, token) in
// `push_tokens` so the Edge-Function dispatcher can fan a single appointment
// notification out to every active device for a given user.

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/services/api/supabase';

type PushPlatform = 'ios' | 'android' | 'web';

function platform(): PushPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Asks the OS for notification permission, fetches the Expo push token, and
 * upserts it against the signed-in user. Safe to call multiple times — the
 * `(user_id, token)` unique constraint absorbs duplicates.
 *
 * Returns the token on success, or null if the device can't deliver pushes
 * (simulator, missing permission, signed-out, etc.). Never throws — failures
 * are observable by the caller via the null return + a console.warn in dev.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const next = await Notifications.requestPermissionsAsync();
      granted = next.granted;
    }
    if (!granted) return null;

    const tokenResult = await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data;
    if (!token) return null;

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: platform(),
          active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      );
    if (error) {
      if (__DEV__) console.warn('[registerForPush] upsert failed', error.message);
      return null;
    }
    return token;
  } catch (err) {
    if (__DEV__) console.warn('[registerForPush] failed', err);
    return null;
  }
}

/**
 * Marks a token as inactive on sign-out so the dispatcher stops sending to
 * a logged-out device. We don't delete the row — keeping it around lets us
 * track multi-device patterns + reactivate cheaply on next sign-in.
 */
export async function deactivatePushToken(token: string | null): Promise<void> {
  if (!token) return;
  try {
    await supabase
      .from('push_tokens')
      .update({ active: false })
      .eq('token', token);
  } catch (err) {
    if (__DEV__) console.warn('[deactivatePushToken] failed', err);
  }
}
