// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as composites from '../index.ts';
import * as primitives from '../primitives/index.ts';

const STORIES = join(dirname(fileURLToPath(import.meta.url)), '../../../../catalog/src');
const IMPORT = /import\s*\{([^}]*)\}\s*from\s*'(@scylla\/ui(?:\/primitives)?)'/g;

const stories = readdirSync(STORIES, { recursive: true, encoding: 'utf8' })
  .filter(path => path.endsWith('.stories.svelte'))
  .map(path => readFileSync(join(STORIES, path), 'utf8'));

/** The names that the stories import from an entry point: a story imports what it shows. */
const shownFrom = (entry: string): Set<string> =>
  new Set(
    stories.flatMap(source =>
      [...source.matchAll(IMPORT)]
        .filter(([, , from]) => from === entry)
        .flatMap(([, names]) => names.split(','))
        .map(name => name.trim())
        .filter(name => name && !name.startsWith('type '))
        .map(name => name.split(/\s+as\s+/)[0]),
    ),
  );

/** A component is a PascalCase function. The other PascalCase values are enums. */
const componentsOf = (module: Record<string, unknown>): string[] =>
  Object.keys(module).filter(name => /^[A-Z]/.test(name) && typeof module[name] === 'function');

describe('the catalog of @scylla/ui', () => {
  it('reads the stories of the catalog', () => {
    expect(shownFrom('@scylla/ui/primitives')).toContain('Button');
  });

  it.each([
    ['@scylla/ui', composites],
    ['@scylla/ui/primitives', primitives],
  ])('has an entry for each component of %s', (entry, module) => {
    const shown = shownFrom(entry);
    const missing = componentsOf(module).filter(name => !shown.has(name));

    expect(missing, `add a story in catalog/src that imports it from '${entry}'`).toEqual([]);
  });
});
