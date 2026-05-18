import { deactivatePushToken, registerForPush } from '@/services/notifications/registerForPush.web';

describe('registerForPush (web stub)', () => {
  it('returns null', async () => {
    await expect(registerForPush()).resolves.toBeNull();
  });

  it('deactivatePushToken is a no-op', async () => {
    await expect(deactivatePushToken('whatever')).resolves.toBeUndefined();
    await expect(deactivatePushToken(null)).resolves.toBeUndefined();
  });
});
