import * as TOML from '@iarna/toml';
import { compareToSchema, type SecretsTree } from '../parse';

const schema = TOML.parse(`
schema_version = "1"

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

[dns.production]
spf = "v=spf1 -all"
`) as unknown as SecretsTree;

describe('compareToSchema', () => {
  it('reports a missing required key', () => {
    const master = TOML.parse(`
schema_version = "1"

[supabase.preview]
EMAIL_DISPATCHER = "mock"

[supabase.production]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(ok).toBe(false);
    expect(issues).toContainEqual({
      kind: 'missing',
      pathParts: ['supabase', 'preview', 'RESEND_API_KEY'],
    });
  });

  it('accepts a fully populated master', () => {
    const master = TOML.parse(`
schema_version = "1"

[supabase.preview]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "mock"

[supabase.production]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(issues).toEqual([]);
    expect(ok).toBe(true);
  });

  it('flags a key that is empty when the schema requires a value', () => {
    const master = TOML.parse(`
schema_version = "1"

[supabase.preview]
RESEND_API_KEY = ""
EMAIL_DISPATCHER = "mock"

[supabase.production]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(ok).toBe(false);
    expect(issues).toContainEqual({
      kind: 'empty',
      pathParts: ['supabase', 'preview', 'RESEND_API_KEY'],
    });
  });

  it('flags an extra key not in the schema', () => {
    const master = TOML.parse(`
schema_version = "1"

[supabase.preview]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "mock"
ROGUE_KEY = "bad"

[supabase.production]
RESEND_API_KEY = "rk"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(ok).toBe(false);
    expect(issues).toContainEqual({
      kind: 'extra',
      pathParts: ['supabase', 'preview', 'ROGUE_KEY'],
    });
  });
});
