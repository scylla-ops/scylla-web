import { describe, it, expect } from 'vitest';
import type { NodeDefinition } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { NodeTemplate } from '@base/features/pipeline/domain/structs/node-template.struct.ts';
import {
  BLANK_NODES,
  catalogEntries,
  catalogText,
  groupCatalog,
  searchCatalog,
  templateFor,
  type CatalogEntry,
  type CatalogText,
} from '../catalog.presenter.ts';

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
  entry('bash', 'nodes', 'Bash script'),
  entry('docker', 'templates', 'docker build', 'docker build -t app .'),
];
const resolve = (text: CatalogText) => (typeof text === 'string' ? text : (text.message ?? ''));
const template: NodeTemplate = {
  id: 'npm-ci',
  name: 'npm ci',
  nodeId: 'install-deps',
  icon: 'package',
  definition: { kind: 'script', shell: 'bash', script: '#!/bin/bash\nnpm ci', env: [] },
};

describe('catalogEntries', () => {
  it('lists the blank nodes first, then the templates', () => {
    const entries = catalogEntries([template]);

    expect(entries.slice(0, BLANK_NODES.length)).toEqual(BLANK_NODES);
    expect(entries.at(-1)).toMatchObject({
      id: 'template:npm-ci',
      group: 'templates',
      name: 'npm ci',
      detail: 'npm ci',
      icon: 'package',
      nodeId: 'install-deps',
    });
  });
});

describe('catalogText', () => {
  it('shows a template text as is and translates a descriptor', () => {
    expect(catalogText('npm ci')).toBe('npm ci');
    expect(catalogText(BLANK_NODES[0].name)).toBe('Bash script');
  });

  it('lets the search match the translated name, whatever the case', () => {
    const entries = catalogEntries([template]);
    expect(searchCatalog(entries, 'BASH', catalogText).map(entry => entry.id)).toEqual([
      'kind:bash',
    ]);
  });
});

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
  it('puts the blank nodes before the templates, whatever the order of the entries', () => {
    expect(
      groupCatalog(entries).map(({ group, items }) => [group, items.map(item => item.id)]),
    ).toEqual([
      ['nodes', ['bash']],
      ['templates', ['npm-ci', 'docker']],
    ]);
  });

  it('leaves out an empty group', () => {
    expect(groupCatalog([entries[0]]).map(({ group }) => group)).toEqual(['templates']);
  });
});

describe('templateFor', () => {
  const template = (id: string, definition: NodeDefinition): CatalogEntry => ({
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

  it('finds the template whose script the node runs, whatever its shell, env or folder', () => {
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

  it('finds the template whose command and arguments the node runs', () => {
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

  it('never takes a blank node for a template', () => {
    const blank: CatalogEntry = { ...gitClone, id: 'kind:sh', group: 'nodes' };
    expect(templateFor([blank], gitClone.definition)).toBeUndefined();
  });
});
