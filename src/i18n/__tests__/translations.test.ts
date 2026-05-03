import { i18next, resources } from '../index';

describe('translations', () => {
  beforeAll(async () => {
    if (i18next.language !== 'en') await i18next.changeLanguage('en');
  });

  afterAll(async () => {
    await i18next.changeLanguage('en');
  });

  it('returns the English value for common.cancel', () => {
    expect(i18next.t('common.cancel', { lng: 'en' })).toBe('Cancel');
  });

  it('returns the Arabic value for common.cancel', () => {
    expect(i18next.t('common.cancel', { lng: 'ar' })).toBe('إلغاء');
  });

  it('exposes en and ar resources at module load', () => {
    expect(Object.keys(resources)).toEqual(['en', 'ar']);
  });
});
