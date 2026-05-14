import { sanitizeReturnTo } from '../postSignIn';

describe('sanitizeReturnTo', () => {
  it('accepts internal relative paths', () => {
    expect(sanitizeReturnTo('/')).toBe('/');
    expect(sanitizeReturnTo('/bookings/123')).toBe('/bookings/123');
    expect(sanitizeReturnTo('/bookings/123?foo=bar')).toBe('/bookings/123?foo=bar');
  });

  it('rejects external and absolute URLs', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBeUndefined();
    expect(sanitizeReturnTo('http://evil.com/path')).toBeUndefined();
  });

  it('rejects protocol-relative and scheme tricks', () => {
    expect(sanitizeReturnTo('//evil.com')).toBeUndefined();
    expect(sanitizeReturnTo('/\\evil.com')).toBeUndefined();
    expect(sanitizeReturnTo('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeReturnTo('data:text/html,<script>')).toBeUndefined();
    expect(sanitizeReturnTo('ma3ady://auth/callback')).toBeUndefined();
  });

  it('rejects non-string and empty inputs', () => {
    expect(sanitizeReturnTo(undefined)).toBeUndefined();
    expect(sanitizeReturnTo(null)).toBeUndefined();
    expect(sanitizeReturnTo('')).toBeUndefined();
    expect(sanitizeReturnTo(123)).toBeUndefined();
    expect(sanitizeReturnTo(['/foo'])).toBeUndefined();
  });
});
