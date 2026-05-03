import en from '../locales/en.json';
import ar from '../locales/ar.json';

type Tree = Record<string, unknown>;

function leafKeys(tree: Tree, prefix: string[] = []): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(tree)) {
    const path = [...prefix, k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...leafKeys(v as Tree, path));
    } else {
      out.push(path.join('.'));
    }
  }
  return out;
}

describe('locale parity', () => {
  const enKeys = leafKeys(en as Tree).sort();
  const arKeys = leafKeys(ar as Tree).sort();

  it('every en.json leaf key has a counterpart in ar.json', () => {
    const missing = enKeys.filter((k) => !arKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('every ar.json leaf key has a counterpart in en.json', () => {
    const extra = arKeys.filter((k) => !enKeys.includes(k));
    expect(extra).toEqual([]);
  });
});
