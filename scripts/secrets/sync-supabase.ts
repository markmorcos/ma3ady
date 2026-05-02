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

export function buildSupabaseArgs(env: Env, projectRef: string, kvs: Record<string, string>) {
  const pairs = Object.entries(kvs)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`);
  return ['secrets', 'set', ...pairs, '--project-ref', projectRef];
}

export function runSyncSupabase(envOverride?: Env, secrets = loadSecrets()) {
  const env = envOverride ?? readEnv();
  const refKey = env === 'preview' ? 'SUPABASE_PROJECT_REF_PREVIEW' : 'SUPABASE_PROJECT_REF_PROD';
  const projectRef = secrets.github[refKey];
  if (!projectRef) {
    throw new Error(`secrets.github.${refKey} is empty; required to address Supabase project`);
  }
  const kvs = secrets.supabase[env];
  const args = buildSupabaseArgs(env, projectRef, kvs);
  console.log(`  · supabase ${args.join(' ')}`);
  const r = spawnSync('supabase', args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`supabase secrets set failed (exit ${r.status})`);
  }
  console.log(`✓ supabase ${env} secrets synced.`);
}

if (require.main === module) {
  try {
    runSyncSupabase();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
