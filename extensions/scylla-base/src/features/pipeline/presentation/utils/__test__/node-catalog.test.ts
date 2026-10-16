// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  groupCatalog,
  searchCatalog,
  type CatalogEntry,
  type CatalogText,
} from '../node-catalog.ts';

const entry = (
  id: string,
  group: CatalogEntry['group'],
  name: string,
  detail = '',
): CatalogEntry => ({
  id,
  group,
  name,
  detail,
  nodeId: id,
  definition: { kind: 'exec', command: 'x', args: [], env: [] },
});

const entries = [
  entry('npm-ci', 'templates', 'npm ci', 'npm ci'),
  entry('bash', 'steps', 'Bash script'),
  entry('docker', 'templates', 'docker build', 'docker build -t app .'),
];
const resolve = (text: CatalogText) => (typeof text === 'string' ? text : (text.message ?? ''));

describe('searchCatalog', () => {
  it('keeps every entry for an empty search', () => {
    expect(searchCatalog(entries, '  ', resolve)).toHaveLength(entries.length);
  });

  it('matches the name or the detail, whatever the case', () => {
    expect(searchCatalog(entries, 'BASH', resolve).map(item => item.id)).toEqual(['bash']);
    expect(searchCatalog(entries, '-t app', resolve).map(item => item.id)).toEqual(['docker']);
  });

  it('finds nothing for an unknown word', () => {
    expect(searchCatalog(entries, 'kubectl', resolve)).toEqual([]);
  });
});

describe('groupCatalog', () => {
  it('puts the blank steps before the templates, whatever the order of the entries', () => {
    expect(
      groupCatalog(entries).map(({ group, items }) => [group, items.map(item => item.id)]),
    ).toEqual([
      ['steps', ['bash']],
      ['templates', ['npm-ci', 'docker']],
    ]);
  });

  it('leaves out an empty group', () => {
    expect(groupCatalog([entries[0]]).map(({ group }) => group)).toEqual(['templates']);
  });
});
