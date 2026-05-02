import * as TOML from '@iarna/toml';
import { compareToSchema, type SecretsTree } from '../parse';

const schema = TOML.parse(`
schema_version = "1"

[github]
EXPO_TOKEN = ""
SUPABASE_PROJECT_REF_PREVIEW = ""

[supabase.preview]
GOOGLE_CLIENT_ID = ""
EMAIL_DISPATCHER = "mock"

[supabase.production]
GOOGLE_CLIENT_ID = ""
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

[github]
SUPABASE_PROJECT_REF_PREVIEW = "ref"

[supabase.preview]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "mock"

[supabase.production]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(ok).toBe(false);
    expect(issues).toContainEqual({ kind: 'missing', pathParts: ['github', 'EXPO_TOKEN'] });
  });

  it('accepts a fully populated master', () => {
    const master = TOML.parse(`
schema_version = "1"

[github]
EXPO_TOKEN = "tok"
SUPABASE_PROJECT_REF_PREVIEW = "ref"

[supabase.preview]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "mock"

[supabase.production]
GOOGLE_CLIENT_ID = "cid"
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

[github]
EXPO_TOKEN = ""
SUPABASE_PROJECT_REF_PREVIEW = "ref"

[supabase.preview]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "mock"

[supabase.production]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { ok, issues } = compareToSchema(master, schema);
    expect(ok).toBe(false);
    expect(issues).toContainEqual({ kind: 'empty', pathParts: ['github', 'EXPO_TOKEN'] });
  });

  it('flags an extra key not in the schema', () => {
    const master = TOML.parse(`
schema_version = "1"

[github]
EXPO_TOKEN = "tok"
SUPABASE_PROJECT_REF_PREVIEW = "ref"
ROGUE_KEY = "bad"

[supabase.preview]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "mock"

[supabase.production]
GOOGLE_CLIENT_ID = "cid"
EMAIL_DISPATCHER = "real"

[eas.preview]
EXPO_PUBLIC_SUPABASE_URL = "url"

[eas.production]
EXPO_PUBLIC_SUPABASE_URL = "url"
`) as unknown as SecretsTree;

    const { issues } = compareToSchema(master, schema);
    expect(issues).toContainEqual({ kind: 'extra', pathParts: ['github', 'ROGUE_KEY'] });
  });
});
