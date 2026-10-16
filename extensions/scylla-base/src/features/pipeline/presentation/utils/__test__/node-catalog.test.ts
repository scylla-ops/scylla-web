import { describe, it, expect } from 'vitest';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import { BLANK_STEPS, catalogEntries, catalogText, searchCatalog } from '../node-catalog.ts';

const template: StepTemplate = {
  id: 'npm-ci',
  name: 'npm ci',
  nodeId: 'install-deps',
  icon: 'package',
  definition: { kind: 'script', shell: 'bash', script: '#!/bin/bash\nnpm ci', env: [] },
};

describe('catalogEntries', () => {
  it('lists the blank steps first, then the templates', () => {
    const entries = catalogEntries([template]);

    expect(entries.slice(0, BLANK_STEPS.length)).toEqual(BLANK_STEPS);
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

describe('searchCatalog', () => {
  const entries = catalogEntries([template]);

  it('keeps every entry for an empty search', () => {
    expect(searchCatalog(entries, '  ', catalogText)).toHaveLength(entries.length);
  });

  it('matches the translated name, whatever the case', () => {
    expect(searchCatalog(entries, 'BASH', catalogText).map(entry => entry.id)).toEqual([
      'kind:bash',
    ]);
  });

  it('matches what a template runs', () => {
    expect(searchCatalog(entries, 'npm', catalogText).map(entry => entry.id)).toEqual([
      'template:npm-ci',
    ]);
  });

  it('finds nothing for an unknown word', () => {
    expect(searchCatalog(entries, 'kubectl', catalogText)).toEqual([]);
  });
});
