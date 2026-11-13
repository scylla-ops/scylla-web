import { describe, it, expect } from 'vitest';
import type { GitRef } from '@base/features/integrations';
import {
  ALL_BRANCHES,
  JOB_EVENTS,
  branchFilterOptions,
  jobEventLabel,
} from '../job-filter.presenter.ts';

const ref = (name: string, overrides: Partial<GitRef> = {}): GitRef => ({
  name,
  kind: 'branch',
  sha: 'a1b2c3d',
  defaultBranch: false,
  webUrl: '',
  ...overrides,
});

describe('branchFilterOptions', () => {
  it('offers all the branches first, then the default branch, and no tag', () => {
    const options = branchFilterOptions([
      ref('feature/login'),
      ref('v1', { kind: 'tag' }),
      ref('main', { defaultBranch: true }),
    ]);

    expect(options).toEqual([
      { value: ALL_BRANCHES, label: 'Branch: All' },
      { value: 'main', label: 'main' },
      { value: 'feature/login', label: 'feature/login' },
    ]);
  });
});

describe('jobEventLabel', () => {
  it('names each event of the proto', () => {
    expect(JOB_EVENTS.map(jobEventLabel)).toEqual([
      'Push',
      'Pull request',
      'Tag',
      'Manual run',
      'Re-run on the provider',
      'Trigger',
    ]);
  });
});
