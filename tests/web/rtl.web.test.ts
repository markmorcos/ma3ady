import { applyRTL } from '@/i18n/rtl.web';

describe('applyRTL (web)', () => {
  beforeEach(() => {
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  it('sets dir=rtl when the locale is ar', async () => {
    await applyRTL('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('sets dir=ltr when the locale is en', async () => {
    await applyRTL('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('flipping from ar to en updates the direction without reload', async () => {
    await applyRTL('ar');
    expect(document.documentElement.dir).toBe('rtl');
    await applyRTL('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
