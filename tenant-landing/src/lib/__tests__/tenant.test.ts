// Mocks must be declared before importing the module under test.
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

jest.mock('../supabase', () => ({
  getAnonClient: () => ({ from }),
}));

import { isValidSlug, resolveTenantBySlug } from '../tenant';

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('demo')).toBe(true);
    expect(isValidSlug('demo-clinic')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('abc123')).toBe(true);
    expect(isValidSlug('a-b-c')).toBe(true);
  });

  it('rejects reserved subdomains/path segments', () => {
    for (const reserved of [
      't',
      'manage',
      'book',
      'en',
      'ar',
      'privacy',
      'terms',
      'sitemap.xml',
      'robots.txt',
      'api',
      'admin',
      'app',
      'auth',
      'manifest.json',
      'apple-app-site-association',
      '.well-known',
    ]) {
      expect(isValidSlug(reserved)).toBe(false);
    }
  });

  it('rejects malformed slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('UPPER')).toBe(false);
    expect(isValidSlug('with space')).toBe(false);
    expect(isValidSlug('with_underscore')).toBe(false);
    expect(isValidSlug('a'.repeat(33))).toBe(false);
  });
});

describe('resolveTenantBySlug', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockClear();
    select.mockClear();
    from.mockClear();
  });

  it('caches the result and only hits Supabase once for the same slug', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'id-1',
        slug: 'cache-test',
        name: 'Cache Test',
        timezone: 'UTC',
        default_locale: 'en',
        brand_color: null,
      },
      error: null,
    });

    const a = await resolveTenantBySlug('cache-test');
    const b = await resolveTenantBySlug('cache-test');
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('returns null for invalid slugs without hitting Supabase', async () => {
    const result = await resolveTenantBySlug('UPPER');
    expect(result).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('returns null when Supabase yields an error', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const result = await resolveTenantBySlug('error-test');
    expect(result).toBeNull();
  });
});
