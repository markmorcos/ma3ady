import { spawnSync } from 'node:child_process';
import { loadSecrets } from './parse';

type Diff = {
  destination: string;
  drift: string[];
  missing: string[];
  extra: string[];
};

function listGithubSecrets(): Set<string> {
  const r = spawnSync('gh', ['secret', 'list', '--json', 'name'], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error('gh secret list failed');
  }
  const arr = JSON.parse(r.stdout) as { name: string }[];
  return new Set(arr.map((x) => x.name));
}

function listSupabaseSecrets(projectRef: string): Set<string> {
  const r = spawnSync('supabase', ['secrets', 'list', '--project-ref', projectRef], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`supabase secrets list failed for ${projectRef}`);
  const lines = r.stdout.split('\n').slice(1);
  const names = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)\b/);
    if (m) names.add(m[1]);
  }
  return names;
}

function listEasEnvs(env: 'preview' | 'production'): Set<string> {
  const r = spawnSync(
    'eas',
    ['env:list', '--environment', env, '--format', 'short', '--non-interactive'],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`eas env:list failed for ${env}`);
  const names = new Set<string>();
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\b/);
    if (m) names.add(m[1]);
  }
  return names;
}

function computeDiff(destination: string, master: Set<string>, deployed: Set<string>): Diff {
  const missing: string[] = [];
  const extra: string[] = [];
  for (const k of master) if (!deployed.has(k)) missing.push(k);
  for (const k of deployed) if (!master.has(k)) extra.push(k);
  return { destination, drift: [], missing, extra };
}

function printDiff(d: Diff) {
  if (d.missing.length === 0 && d.extra.length === 0) {
    console.log(`${d.destination}: clean`);
    return;
  }
  console.log(d.destination);
  for (const k of d.missing) console.log(`  MISSING (in master, not in deployment): ${k}`);
  for (const k of d.extra) console.log(`  EXTRA   (in deployment, not in master): ${k}`);
}

export function runAudit(secrets = loadSecrets()) {
  const githubMaster = new Set(Object.keys(secrets.github));
  const githubDeployed = listGithubSecrets();
  printDiff(computeDiff('[github]', githubMaster, githubDeployed));

  for (const env of ['preview', 'production'] as const) {
    const refKey = env === 'preview' ? 'SUPABASE_PROJECT_REF_PREVIEW' : 'SUPABASE_PROJECT_REF_PROD';
    const ref = secrets.github[refKey];
    if (!ref) {
      console.log(`[supabase.${env}]: skipped (no project ref configured)`);
      continue;
    }
    const master = new Set(Object.keys(secrets.supabase[env]));
    const deployed = listSupabaseSecrets(ref);
    printDiff(computeDiff(`[supabase.${env}]`, master, deployed));
  }

  for (const env of ['preview', 'production'] as const) {
    const master = new Set(Object.keys(secrets.eas[env]));
    const deployed = listEasEnvs(env);
    printDiff(computeDiff(`[eas.${env}]`, master, deployed));
  }
}

if (require.main === module) {
  try {
    runAudit();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
