import { buildEasArgs } from '../sync-eas';

describe('buildEasArgs', () => {
  it('produces a non-interactive force overwrite', () => {
    const args = buildEasArgs('preview', 'EXPO_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    expect(args).toEqual([
      'env:create',
      '--environment',
      'preview',
      '--name',
      'EXPO_PUBLIC_SUPABASE_URL',
      '--value',
      'https://x.supabase.co',
      '--visibility',
      'plaintext',
      '--type',
      'string',
      '--non-interactive',
      '--force',
    ]);
  });
});
