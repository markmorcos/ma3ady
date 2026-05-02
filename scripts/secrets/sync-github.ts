import { execSync, spawnSync } from 'node:child_process';
import { loadSecrets } from './parse';

function ensureGhAuthed() {
  const r = spawnSync('gh', ['auth', 'status'], { stdio: 'pipe' });
  if (r.status !== 0) {
    throw new Error('gh CLI not authenticated. Run `gh auth login` first.');
  }
}

function setSecret(name: string, value: string) {
  const r = spawnSync('gh', ['secret', 'set', name, '--body', value], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (r.status !== 0) {
    throw new Error(`failed to set GitHub secret ${name} (exit ${r.status})`);
  }
}

export function runSyncGithub(secrets = loadSecrets()) {
  ensureGhAuthed();
  const entries = Object.entries(secrets.github);
  if (entries.length === 0) {
    console.log('no [github] entries to sync');
    return;
  }
  for (const [name, value] of entries) {
    if (!value) {
      console.warn(`  ⚠ skipping ${name} (empty value)`);
      continue;
    }
    console.log(`  · gh secret set ${name}`);
    setSecret(name, value);
  }
  console.log(`✓ ${entries.length} GitHub secrets synced.`);
}

if (require.main === module) {
  try {
    runSyncGithub();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

export { execSync };
