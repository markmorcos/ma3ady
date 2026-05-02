import { spawnSync } from 'node:child_process';
import { loadSecrets } from './parse';

type Env = 'preview' | 'production';

function readEnv(): Env {
  const raw = process.env.ENV ?? process.argv.slice(2).find((a) => a.startsWith('ENV='))?.slice(4);
  if (raw !== 'preview' && raw !== 'production') {
    throw new Error(`ENV=preview|production required (got ${raw ?? 'undefined'})`);
  }
  return raw;
}

export function buildEasArgs(env: Env, name: string, value: string) {
  return [
    'env:create',
    '--environment',
    env,
    '--name',
    name,
    '--value',
    value,
    '--visibility',
    'plaintext',
    '--type',
    'string',
    '--non-interactive',
    '--force',
  ];
}

export function runSyncEas(envOverride?: Env, secrets = loadSecrets()) {
  const env = envOverride ?? readEnv();
  const kvs = secrets.eas[env];
  let count = 0;
  for (const [name, value] of Object.entries(kvs)) {
    if (!value) {
      console.warn(`  ⚠ skipping ${name} (empty value)`);
      continue;
    }
    const args = buildEasArgs(env, name, value);
    console.log(`  · eas env:create --environment ${env} --name ${name}`);
    const r = spawnSync('eas', args, { stdio: 'inherit' });
    if (r.status !== 0) {
      throw new Error(`eas env:create failed for ${name} (exit ${r.status})`);
    }
    count++;
  }
  console.log(`✓ ${count} EAS ${env} env vars synced.`);
}

if (require.main === module) {
  try {
    runSyncEas();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
