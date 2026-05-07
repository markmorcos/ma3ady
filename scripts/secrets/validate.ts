import { EXAMPLE_PATH, isCredentialKey, parseFile } from './parse';

function flatten(obj: unknown, prefix: string[] = []): { path: string[]; value: unknown }[] {
  if (typeof obj !== 'object' || obj === null) return [{ path: prefix, value: obj }];
  const out: { path: string[]; value: unknown }[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out.push(...flatten(v, [...prefix, k]));
  }
  return out;
}

export function validateExample(file = EXAMPLE_PATH): string[] {
  const errors: string[] = [];
  const tree = parseFile(file);
  if ((tree as unknown as { schema_version?: string }).schema_version !== '1') {
    errors.push('schema_version must be "1"');
  }
  for (const required of ['supabase', 'eas']) {
    if (!(required in (tree as unknown as Record<string, unknown>))) {
      errors.push(`missing top-level section: [${required}]`);
    }
  }
  for (const { path, value } of flatten(tree)) {
    if (typeof value !== 'string') continue;
    const leaf = path[path.length - 1];
    if (!leaf) continue;
    if (isCredentialKey(leaf) && value !== '') {
      errors.push(`example file must not contain a non-empty credential value: ${path.join('.')}`);
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = validateExample();
  if (errors.length > 0) {
    console.error('secrets.example.toml is invalid:');
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log('✓ secrets.example.toml is valid.');
}
