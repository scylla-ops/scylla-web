// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { StepDefinition } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import {
  groupCatalog,
  searchCatalog,
  templateFor,
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

describe('templateFor', () => {
  const template = (id: string, definition: StepDefinition): CatalogEntry => ({
    id,
    group: 'templates',
    name: id,
    detail: '',
    icon: id,
    nodeId: id,
    definition,
  });
  const gitClone = template('git', {
    kind: 'script',
    shell: 'sh',
    script: 'git clone --depth 1 "$REPO_URL" .',
    env: [{ key: 'REPO_URL', kind: 'literal', value: '' }],
  });
  const dockerBuild = template('container', {
    kind: 'exec',
    command: 'docker',
    args: ['build', '.'],
    env: [],
  });
  const catalog = [gitClone, dockerBuild];

  it('finds the template whose script the step runs, whatever its shell, env or folder', () => {
    expect(
      templateFor(catalog, {
        kind: 'script',
        shell: 'bash',
        script: '  git clone --depth 1 "$REPO_URL" .\n',
        workingDir: 'src',
        env: [],
      }),
    ).toBe(gitClone);
  });

  it('finds the template whose command and arguments the step runs', () => {
    expect(
      templateFor(catalog, { kind: 'exec', command: 'docker', args: ['build', '.'], env: [] }),
    ).toBe(dockerBuild);
  });

  it('finds nothing once the code differs, even by one argument', () => {
    expect(
      templateFor(catalog, { kind: 'exec', command: 'docker', args: ['build'], env: [] }),
    ).toBeUndefined();
    expect(
      templateFor(catalog, { kind: 'script', shell: 'sh', script: 'git clone x .', env: [] }),
    ).toBeUndefined();
  });

  it('never takes a blank step for a template', () => {
    const blank: CatalogEntry = { ...gitClone, id: 'kind:sh', group: 'steps' };
    expect(templateFor([blank], gitClone.definition)).toBeUndefined();
  });
});
