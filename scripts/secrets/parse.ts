import * as fs from 'node:fs';
import * as path from 'node:path';
import * as TOML from '@iarna/toml';

export type SecretsTree = {
  schema_version: string;
  supabase: { preview: Record<string, string>; production: Record<string, string> };
  eas: { preview: Record<string, string>; production: Record<string, string> };
  k8s?: { preview?: Record<string, string>; production?: Record<string, string> };
  dns?: { production?: Record<string, string> };
};

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const EXAMPLE_PATH = path.join(REPO_ROOT, 'secrets', 'secrets.example.toml');
export const LOCAL_PATH = path.join(REPO_ROOT, 'secrets', 'secrets.local.toml');

const CREDENTIAL_KEY_PATTERNS = [/_TOKEN$/, /_SECRET$/, /_KEY$/, /_PASSWORD$/];

export function parseFile(file: string): SecretsTree {
  const raw = fs.readFileSync(file, 'utf8');
  return TOML.parse(raw) as unknown as SecretsTree;
}

export type ValidationIssue =
  | { kind: 'missing'; pathParts: string[] }
  | { kind: 'extra'; pathParts: string[] }
  | { kind: 'empty'; pathParts: string[] };

export function compareToSchema(
  master: SecretsTree,
  schema: SecretsTree,
): { ok: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  walk(schema as unknown as Record<string, unknown>, master as unknown as Record<string, unknown>, [], issues);

  return { ok: issues.length === 0, issues };
}

const OPTIONAL_TOP_LEVEL_SECTIONS = new Set(['dns', 'k8s', 'supabase_auth']);

function walk(
  schema: Record<string, unknown>,
  master: Record<string, unknown>,
  prefix: string[],
  issues: ValidationIssue[],
) {
  for (const [key, schemaVal] of Object.entries(schema)) {
    const here = [...prefix, key];
    const masterVal = master?.[key];

    if (isSection(schemaVal)) {
      if (!isSection(masterVal)) {
        if (prefix.length === 0 && OPTIONAL_TOP_LEVEL_SECTIONS.has(key)) {
          continue;
        }
        issues.push({ kind: 'missing', pathParts: here });
        continue;
      }
      walk(schemaVal, masterVal, here, issues);
      continue;
    }

    if (masterVal === undefined) {
      issues.push({ kind: 'missing', pathParts: here });
      continue;
    }

    if (mustBeNonEmpty(here, schemaVal) && (masterVal === '' || masterVal == null)) {
      issues.push({ kind: 'empty', pathParts: here });
    }
  }

  if (master) {
    for (const key of Object.keys(master)) {
      if (!(key in schema)) {
        issues.push({ kind: 'extra', pathParts: [...prefix, key] });
      }
    }
  }
}

function isSection(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mustBeNonEmpty(pathParts: string[], schemaVal: unknown): boolean {
  if (typeof schemaVal !== 'string') return false;
  if (schemaVal !== '') {
    return false;
  }
  if (OPTIONAL_TOP_LEVEL_SECTIONS.has(pathParts[0] ?? '')) return false;
  return true;
}

export function isCredentialKey(name: string): boolean {
  return CREDENTIAL_KEY_PATTERNS.some((re) => re.test(name));
}

export function loadSecrets(): SecretsTree {
  if (!fs.existsSync(LOCAL_PATH)) {
    throw new Error(
      `secrets.local.toml not found at ${LOCAL_PATH}. Copy secrets.example.toml and fill in values.`,
    );
  }
  if (!fs.existsSync(EXAMPLE_PATH)) {
    throw new Error(`secrets.example.toml missing at ${EXAMPLE_PATH}`);
  }
  const master = parseFile(LOCAL_PATH);
  const schema = parseFile(EXAMPLE_PATH);
  const { ok, issues } = compareToSchema(master, schema);
  if (!ok) {
    throw new Error(formatIssues(issues));
  }
  return master;
}

export function formatIssues(issues: ValidationIssue[]): string {
  const lines = issues.map((i) => {
    const dotted = i.pathParts.join('.');
    if (i.kind === 'missing') return `  ✗ MISSING: ${dotted}`;
    if (i.kind === 'extra') return `  ⚠ EXTRA:   ${dotted}`;
    return `  ✗ EMPTY:   ${dotted}`;
  });
  return `secrets validation failed:\n${lines.join('\n')}`;
}

if (require.main === module) {
  try {
    loadSecrets();
    console.log('✓ secrets.local.toml is valid against the schema.');
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
