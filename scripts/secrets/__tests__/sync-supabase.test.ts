import { buildSupabaseArgs } from '../sync-supabase';

describe('buildSupabaseArgs', () => {
  it('builds a single batch invocation skipping empty values', () => {
    const args = buildSupabaseArgs('preview', 'projref123', {
      GOOGLE_CLIENT_ID: 'gid',
      RESEND_API_KEY: '',
      EMAIL_DISPATCHER: 'mock',
    });
    expect(args).toEqual([
      'secrets',
      'set',
      'GOOGLE_CLIENT_ID=gid',
      'EMAIL_DISPATCHER=mock',
      '--project-ref',
      'projref123',
    ]);
  });

  it('addresses the production project ref', () => {
    const args = buildSupabaseArgs('production', 'prodref', { K: 'V' });
    expect(args).toContain('--project-ref');
    const idx = args.indexOf('--project-ref');
    expect(args[idx + 1]).toBe('prodref');
  });
});
