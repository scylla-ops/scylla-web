import { describe, it, expect } from 'vitest';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import { mergeCardDescription, mergeRuleView } from '../merge-block.presenter.ts';

const github = {
  provider: 'github',
  account: 'acme',
  fullName: 'acme/api',
  defaultBranch: 'main',
} as RepositoryLink;
const gitlab = {
  provider: 'gitlab',
  account: 'scylla-bot',
  fullName: 'bank/payments',
  defaultBranch: 'main',
} as RepositoryLink;

const block = (patch: Partial<MergeBlock> = {}): MergeBlock => ({
  projectId: 'p-1',
  pipelineId: 'pl-1',
  context: 'scylla/build',
  enabled: false,
  state: 'off',
  stateReason: '',
  branch: 'main',
  actionUrl: 'https://github.com/acme/api/rules/7',
  updatedAt: '',
  ...patch,
});

describe('mergeRuleView', () => {
  it('shows the switch as the rule on the provider, not as the wanted value', () => {
    const view = (patch: Partial<MergeBlock>) => mergeRuleView(block(patch), github).checked;

    expect(view({ enabled: true, state: 'on' })).toBe(true);
    expect(view({ enabled: true, state: 'out_of_sync' })).toBe(true);
    expect(view({ enabled: true, state: 'needs_permission' })).toBe(false);
    expect(view({ enabled: true, state: 'not_possible' })).toBe(false);
    // A refusal changes nothing on the provider: the rule keeps its value before the change.
    expect(view({ enabled: true, state: 'failed' })).toBe(false);
    expect(view({ enabled: false, state: 'failed' })).toBe(true);
    expect(view({ enabled: false, state: 'applying' })).toBe(false);
  });

  it('shows a change that the server did not answer yet as applying, with its value', () => {
    const view = mergeRuleView(block({ state: 'on', enabled: true }), github, false);

    expect(view).toMatchObject({ state: 'applying', checked: false, badge: null, link: null });
    expect(view.detail).toBe('Updating GitHub…');
  });

  it('names the branch and the check of a GitHub rule, and links the ruleset when on', () => {
    const view = mergeRuleView(block({ enabled: true, state: 'on' }), github);

    expect(view.title).toBe('Block the merge into main when scylla/build fails');
    expect(view.badge).toEqual({ text: 'Required on main', tone: 'success' });
    expect(view.detail).toBe('Ruleset "Scylla required checks" on acme/api.');
    expect(view.link).toEqual({
      url: 'https://github.com/acme/api/rules/7',
      text: 'View on GitHub',
    });
  });

  it('gives the members page, the role and the steps of GitLab, with nothing to copy', () => {
    const view = mergeRuleView(
      block({
        pipelineId: undefined,
        context: '',
        enabled: true,
        state: 'needs_permission',
        stateReason: 'ROLE_TOO_LOW',
        actionUrl: 'https://gitlab.com/bank/payments/-/project_members',
      }),
      gitlab,
    );

    expect(view.title).toBe('Block the merge when a Scylla pipeline fails');
    expect(view.detail).toBe(
      'The service account is Developer. Give it Maintainer to create the webhook and block merges.',
    );
    expect(view.link?.text).toBe('Give the Maintainer role on GitLab');
    expect(view.steps).toEqual([
      'On GitLab, open bank/payments › Settings › Merge requests.',
      'Under Merge checks, select "Pipelines must succeed".',
      'Save the changes.',
    ]);
    expect(view.copy).toBe('');
  });

  it('gives the check to copy in the GitHub steps', () => {
    const view = mergeRuleView(
      block({ enabled: true, state: 'needs_permission', actionUrl: '' }),
      github,
    );

    expect(view.steps).toHaveLength(3);
    expect(view.copy).toBe('scylla/build');
    expect(view.link).toBeNull();
  });

  it('tells why a change failed, and offers to try again', () => {
    const view = (stateReason: string) =>
      mergeRuleView(block({ enabled: true, state: 'failed', stateReason }), github);

    expect(view('PROVIDER_LIMIT').detail).toBe('GitHub limit reached. Try again in some minutes.');
    expect(view('PROVIDER_UNAVAILABLE').detail).toBe('GitHub did not answer.');
    expect(view('SOMETHING_NEW').detail).toBe('The rule did not change on GitHub.');
    expect(view('PROVIDER_LIMIT')).toMatchObject({
      badge: { text: 'Not applied', tone: 'destructive' },
      retry: 'Try again',
    });
  });

  it('says what a GitLab rule that is off does', () => {
    const view = mergeRuleView(block({ pipelineId: undefined, context: '' }), gitlab);

    expect(view.detail).toBe('A failed Scylla pipeline does not block the merge.');
  });
});

describe('mergeCardDescription', () => {
  it('names the ruleset on GitHub and the setting of the project on GitLab', () => {
    expect(mergeCardDescription(github)).toBe(
      'Scylla keeps one ruleset "Scylla required checks" on the default branch of acme/api.',
    );
    expect(mergeCardDescription(gitlab)).toContain('"Pipelines must succeed" in bank/payments.');
  });
});
