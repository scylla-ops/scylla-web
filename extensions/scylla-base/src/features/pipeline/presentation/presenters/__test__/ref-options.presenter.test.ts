import { describe, it, expect } from 'vitest';
import type { GitRef } from '@base/features/integrations';
import { SHA_OPTION, refOptions, runTargetOptions } from '../ref-options.presenter.ts';

const ref = (overrides: Partial<GitRef>): GitRef => ({
  name: 'main',
  kind: 'branch',
  sha: 'a1b2c3d4e5f6',
  defaultBranch: false,
  webUrl: '',
  ...overrides,
});

describe('refOptions', () => {
  it('puts the default branch first, then the branches, then the tags', () => {
    const options = refOptions([
      ref({ name: 'v1.2.0', kind: 'tag' }),
      ref({ name: 'feature/login' }),
      ref({ name: 'main', defaultBranch: true }),
    ]);

    expect(options.map(option => option.value)).toEqual([
      'branch:main',
      'branch:feature/login',
      'tag:v1.2.0',
    ]);
  });

  it('shows the head of a branch, the commit of a tag, and which branch is the default', () => {
    const [main, tag] = refOptions([
      ref({ name: 'main', defaultBranch: true }),
      ref({ name: 'v1', kind: 'tag', sha: 'f6e5d4c3b2' }),
    ]);

    expect(main.hint).toBe('head a1b2c3d · default');
    expect(tag.hint).toBe('f6e5d4c');
    expect(tag.keywords).toEqual(['f6e5d4c3b2']);
  });

  it('gives a branch and a tag of the same name their own row', () => {
    const values = refOptions([ref({ name: 'v1' }), ref({ name: 'v1', kind: 'tag' })]).map(
      option => option.value,
    );

    expect(new Set(values).size).toBe(2);
  });

  it('shows no head for a ref whose commit is not known yet', () => {
    expect(refOptions([ref({ sha: '', defaultBranch: true })])[0].hint).toBe('default');
  });
});

describe('runTargetOptions', () => {
  it('ends with the row of a commit SHA', () => {
    const options = runTargetOptions([ref({})]);

    expect(options.at(-1)).toMatchObject({
      value: SHA_OPTION,
      kind: 'sha',
      label: 'Use a commit SHA',
    });
  });
});
