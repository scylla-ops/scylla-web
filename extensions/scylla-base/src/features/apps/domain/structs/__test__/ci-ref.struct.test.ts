// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ciRuleOf, ciRuleText } from '../ci-ref.struct.ts';
import { grantsOf } from '../app-grants.struct.ts';

describe('CI ref rules', () => {
  it('writes a GitHub branch as its full ref, and a GitLab branch as its name', () => {
    expect(ciRuleOf('github', 'branch', ' main ')).toEqual({
      gitRef: 'refs/heads/main',
      environment: '',
    });
    expect(ciRuleOf('gitlab', 'branch', 'main')).toEqual({ gitRef: 'main', environment: '' });
    expect(ciRuleOf('github', 'environment', 'prod')).toEqual({ gitRef: '', environment: 'prod' });
    expect(ciRuleOf('github', 'any', 'main')).toEqual({ gitRef: '', environment: '' });
    expect(ciRuleOf('github', 'branch', '  ')).toEqual({ gitRef: '', environment: '' });
  });

  it('reads the rule of an identity back', () => {
    expect(ciRuleText({ gitRef: 'refs/heads/main', environment: '' })).toEqual({
      kind: 'branch',
      value: 'main',
    });
    expect(ciRuleText({ gitRef: '', environment: 'prod' })).toEqual({
      kind: 'environment',
      value: 'prod',
    });
    expect(ciRuleText({ gitRef: '', environment: '' })).toEqual({ kind: 'any', value: '' });
  });
});

describe('role grants', () => {
  it('gives the workspace role first, then each project role that is set', () => {
    expect(grantsOf('member', { 'p-1': 'editor', 'p-2': '' })).toEqual([
      { projectId: null, role: 'member' },
      { projectId: 'p-1', role: 'editor' },
    ]);
    expect(grantsOf('', {})).toEqual([]);
  });
});
