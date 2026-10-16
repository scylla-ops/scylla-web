import { describe, it, expect } from 'vitest';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import { searchCatalog } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
import { BLANK_STEPS, catalogEntries, catalogText } from '../catalog.ts';

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

describe('catalogText', () => {
  it('shows a template text as is and translates a descriptor', () => {
    expect(catalogText('npm ci')).toBe('npm ci');
    expect(catalogText(BLANK_STEPS[0].name)).toBe('Bash script');
  });

  it('lets the search match the translated name, whatever the case', () => {
    const entries = catalogEntries([template]);
    expect(searchCatalog(entries, 'BASH', catalogText).map(entry => entry.id)).toEqual([
      'kind:bash',
    ]);
  });
});
