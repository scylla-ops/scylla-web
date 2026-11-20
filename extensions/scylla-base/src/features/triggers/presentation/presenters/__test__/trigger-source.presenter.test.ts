import { describe, it, expect } from 'vitest';
import type { RepositoryLink } from '@base/features/integrations';
import {
  gitKindHint,
  gitNotes,
  gitSourceSummary,
  gitVariables,
  triggerKindLabel,
} from '../trigger-source.presenter.ts';

const link = (provider: 'github' | 'gitlab') =>
  ({ provider, fullName: 'acme/api', webUrl: 'https://github.com/acme/api' }) as RepositoryLink;

describe('trigger source presenter', () => {
  it('names a pull request a merge request on GitLab only', () => {
    expect(triggerKindLabel('pullRequest', 'github')).toBe('Pull request');
    expect(triggerKindLabel('pullRequest', 'gitlab')).toBe('Merge request');
    expect(triggerKindLabel('pullRequest')).toBe('Pull request');
    expect(triggerKindLabel('cron')).toBe('Schedule');
    expect(gitNotes('gitlab').fork).toMatch(/^Merge requests from forks/);
  });

  it('sums up the rules of a row of the list', () => {
    expect(
      gitSourceSummary({
        kind: 'push',
        branches: ['main', 'release/*'],
        excludeBranches: [],
        skipCi: true,
      }),
    ).toBe('main, release/*');
    expect(
      gitSourceSummary({ kind: 'pullRequest', branches: ['main'], events: [], drafts: false }),
    ).toBe('into main · drafts skipped');
    expect(
      gitSourceSummary({ kind: 'pullRequest', branches: [], events: [], drafts: true }),
    ).toBe('into each branch');
    expect(gitSourceSummary({ kind: 'tag', patterns: [] })).toBe('each tag');
  });

  it('names the repository in the hint of a push when it is known', () => {
    expect(gitKindHint('push', link('github'))).toBe(
      'A push to a matching branch of acme/api starts a run.',
    );
    expect(gitKindHint('push')).toBe('A push to a matching branch starts a run.');
  });

  it('lists the variables of the kind, with the values of the linked repository', () => {
    const names = (kind: 'push' | 'pullRequest' | 'tag') =>
      gitVariables(kind).map(variable => variable.name);

    expect(names('pullRequest')).toContain('SCYLLA_PR_NUMBER');
    expect(names('push')).not.toContain('SCYLLA_PR_NUMBER');
    expect(names('tag')).not.toContain('SCYLLA_GIT_BRANCH');
    expect(gitVariables('tag', link('github'))).toContainEqual({
      name: 'SCYLLA_REPO',
      description: 'acme/api',
    });
  });
});
