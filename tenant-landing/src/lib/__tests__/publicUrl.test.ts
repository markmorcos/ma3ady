import { publicUrl } from '../publicUrl';

function reqWith(headers: Record<string, string>, url = 'http://internal-pod:8080/whatever'): Request {
  return new Request(url, { headers });
}

beforeAll(() => {
  process.env.SUPABASE_URL = 'http://stub';
  process.env.SUPABASE_ANON_KEY = 'stub';
  process.env.APEX_HOST = 'ma3ady.com';
});

describe('publicUrl', () => {
  it('uses x-forwarded-host + x-forwarded-proto when present', () => {
    const u = publicUrl(
      reqWith({ 'x-forwarded-host': 'ma3ady.com', 'x-forwarded-proto': 'https' }),
      '/t/demo/book/confirm',
    );
    expect(u.toString()).toBe('https://ma3ady.com/t/demo/book/confirm');
  });

  it('takes the first entry when forwarded headers are comma-lists', () => {
    const u = publicUrl(
      reqWith({
        'x-forwarded-host': 'ma3ady.com, internal-lb',
        'x-forwarded-proto': 'https, http',
      }),
      '/x',
    );
    expect(u.toString()).toBe('https://ma3ady.com/x');
  });

  it('defaults proto to https when x-forwarded-proto is absent', () => {
    const u = publicUrl(reqWith({ 'x-forwarded-host': 'preview.ma3ady.com' }), '/x');
    expect(u.toString()).toBe('https://preview.ma3ady.com/x');
  });

  it('falls back to APEX_HOST when no forwarded headers are present', () => {
    const u = publicUrl(reqWith({}), '/manage/tok');
    expect(u.toString()).toBe('https://ma3ady.com/manage/tok');
  });

  it('preserves query strings in the path argument', () => {
    const u = publicUrl(reqWith({ 'x-forwarded-host': 'ma3ady.com' }), '/x');
    u.searchParams.set('id', '1');
    u.searchParams.set('token', 'abc def');
    expect(u.toString()).toBe('https://ma3ady.com/x?id=1&token=abc+def');
  });
});
