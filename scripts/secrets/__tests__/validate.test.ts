import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateExample } from '../validate';

function tmpFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-validate-'));
  const file = path.join(dir, 'secrets.example.toml');
  fs.writeFileSync(file, content);
  return file;
}

describe('validateExample', () => {
  it('passes for a clean example file', () => {
    const file = tmpFile(`
schema_version = "1"

[github]
EXPO_TOKEN = ""

[supabase.preview]
RESEND_API_KEY = ""
EMAIL_DISPATCHER = "mock"

[supabase.production]
RESEND_API_KEY = ""
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = ""

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = ""
`);
    expect(validateExample(file)).toEqual([]);
  });

  it('rejects a non-empty credential value in the example', () => {
    const file = tmpFile(`
schema_version = "1"

[github]
EXPO_TOKEN = "actually_a_token"

[supabase.preview]
RESEND_API_KEY = ""

[supabase.production]
RESEND_API_KEY = ""

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = ""

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = ""
`);
    const errors = validateExample(file);
    expect(errors.some((e) => e.includes('github.EXPO_TOKEN'))).toBe(true);
  });

  it('rejects a missing top-level section', () => {
    const file = tmpFile(`
schema_version = "1"

[github]
EXPO_TOKEN = ""
`);
    const errors = validateExample(file);
    expect(errors).toContain('missing top-level section: [supabase]');
  });

  it('rejects a wrong schema_version', () => {
    const file = tmpFile(`
schema_version = "2"

[github]

[supabase.preview]

[supabase.production]

[eas.preview]

[eas.production]
`);
    const errors = validateExample(file);
    expect(errors).toContain('schema_version must be "1"');
  });
});
