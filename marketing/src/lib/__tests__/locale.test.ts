import { dirOf, t } from '../locale';

describe('t()', () => {
  it('returns the matching string from the en bundle', () => {
    // tagline / available.title / available.subtitle / available.duration
    expect(typeof t('en', 'tagline')).toBe('string');
    expect(typeof t('en', 'available.title')).toBe('string');
  });

  it('falls back to the key when not found', () => {
    expect(t('en', 'definitely.not.a.real.key')).toBe(
      'definitely.not.a.real.key',
    );
  });

  it('interpolates variables', () => {
    // available.duration uses {{duration}}
    const out = t('en', 'available.duration', { duration: 30 });
    expect(out).toMatch(/30/);
  });
});

describe('dirOf', () => {
  it('returns rtl for ar and ltr otherwise', () => {
    expect(dirOf('ar')).toBe('rtl');
    expect(dirOf('en')).toBe('ltr');
  });
});
