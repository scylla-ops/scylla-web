import { describe, it, expect } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type { ProviderRepository } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import {
  deliveryErrorText,
  deliveryResult,
  eventsLine,
  hostOf,
  linkAlert,
  linkErrorText,
  linkSubtitle,
  reportContexts,
  repositoryName,
  repositoryOptionDetails,
  unlinkStops,
} from '../repository-link.presenter.ts';

const link = (patch: Partial<RepositoryLink> = {}): RepositoryLink => ({
  projectId: 'p-1',
  workspaceId: 'ws-1',
  connectionId: 'c-1',
  provider: 'github',
  account: 'acme',
  externalId: '7',
  fullName: 'acme/api',
  webUrl: 'https://github.com/acme/api',
  defaultBranch: 'main',
  private: true,
  pipelineSource: 'editor',
  reportsEnabled: true,
  deliveryMode: 'webhook',
  pollIntervalSeconds: 120,
  state: 'active',
  stateReason: '',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

const block = (patch: Partial<MergeBlock> = {}): MergeBlock => ({
  projectId: 'p-1',
  pipelineId: 'pl-1',
  context: 'scylla/build',
  enabled: false,
  state: 'off',
  stateReason: '',
  branch: 'main',
  actionUrl: '',
  updatedAt: '',
  ...patch,
});

describe('repository link presenter', () => {
  it('names the repository with its visibility, the account and the host of the provider', () => {
    expect(linkSubtitle(link())).toBe('Private · connection acme · github.com');
    expect(linkSubtitle(link({ private: false, webUrl: 'not a url', provider: 'gitlab' }))).toBe(
      'Public · connection acme · gitlab.com',
    );
    expect(hostOf('https://gitlab.com/-/profile', 'gitlab')).toBe('gitlab.com');
  });

  it('offers a test webhook in webhook mode, and tells when no event came yet', () => {
    expect(eventsLine(link())).toEqual({
      mode: 'webhook',
      text: 'Webhooks · no event yet',
      reason: '',
      action: 'test',
    });
  });

  it('says why the link polls: the provider cannot reach the server, a low role, a disabled webhook', () => {
    expect(eventsLine(link({ deliveryMode: 'polling' }))).toEqual({
      mode: 'polling',
      text: 'Polling every 2 min',
      reason: 'GitHub cannot reach this Scylla server.',
      action: 'test',
    });
    expect(
      eventsLine(link({ provider: 'gitlab', deliveryMode: 'polling', stateReason: 'ROLE_TOO_LOW' })),
    ).toMatchObject({
      reason:
        'The service account is Developer. Give it Maintainer to create the webhook and block merges.',
      action: null,
    });
    expect(
      eventsLine(
        link({
          provider: 'gitlab',
          deliveryMode: 'polling',
          pollIntervalSeconds: 60,
          state: 'needs_attention',
          stateReason: 'WEBHOOK_DISABLED',
        }),
      ),
    ).toMatchObject({
      text: 'Polling every minute',
      reason: 'GitLab disabled the webhook after failures.',
      action: 'enable_again',
    });
  });

  it('says that the GitHub App has no webhook, and offers the test to check it again', () => {
    const noWebhook = link({ deliveryMode: 'polling', stateReason: 'APP_HAS_NO_WEBHOOK' });

    expect(eventsLine(noWebhook)).toEqual({
      mode: 'polling',
      text: 'Polling every 2 min',
      reason: 'The GitHub App has no webhook.',
      action: 'test',
    });
    expect(eventsLine({ ...noWebhook, state: 'suspended' }).action).toBeNull();
  });

  it('offers no test on a link that stopped: the card says why instead', () => {
    const stopped = link({ state: 'disconnected', stateReason: 'APP_UNINSTALLED' });

    expect(eventsLine(stopped).action).toBeNull();
    expect(linkAlert(stopped)).toEqual({
      text: 'The GitHub App was uninstalled from acme. Reports, triggers and checkouts stopped.',
      repair: 'integrations',
    });
    expect(linkAlert(link())).toBeNull();
  });

  it('sends a repository that the connection cannot see to the installation on the provider', () => {
    expect(
      linkAlert(link({ state: 'needs_attention', stateReason: 'REPOSITORY_NOT_VISIBLE' })),
    ).toEqual({
      text: 'Scylla cannot see acme/api. Add it to the installation on GitHub.',
      repair: 'configure',
    });
    expect(
      linkAlert(
        link({ provider: 'gitlab', state: 'needs_attention', stateReason: 'REPOSITORY_NOT_VISIBLE' }),
      )?.text,
    ).toBe('Scylla cannot see acme/api. Add the service account to the project on GitLab.');
  });

  it('takes the names of the reports from the merge rules, one per pipeline', () => {
    expect(
      reportContexts([
        block(),
        block({ pipelineId: 'pl-2', context: 'scylla/deploy' }),
        block({ pipelineId: undefined, context: '' }),
      ]),
    ).toEqual(['scylla/build', 'scylla/deploy']);
  });

  it('lists what stops on an unlink: triggers, checkout, reports and the merge rules that are on', () => {
    expect(
      unlinkStops(link(), [
        block({ enabled: true, state: 'on' }),
        block({ pipelineId: 'pl-2', context: 'scylla/deploy' }),
      ]),
    ).toEqual([
      'The push, pull request and tag triggers of the pipelines.',
      'The checkout of the code before the first node.',
      'The reports to GitHub.',
      'The rules that block the merge: scylla/build.',
    ]);
    expect(
      unlinkStops(link({ provider: 'gitlab', reportsEnabled: false, pipelineSource: 'file' }), [
        block({ pipelineId: undefined, context: '', enabled: true }),
      ]),
    ).toEqual([
      'The push, pull request and tag triggers of the pipelines.',
      'The pipelines from the files of the repository.',
      'The checkout of the code before the first node.',
      'The rule "Pipelines must succeed" of the project.',
      'Scylla deletes the webhook of the project on GitLab.',
    ]);
  });

  it('gives the result of a test webhook, and a server without the test as a plain fact', () => {
    expect(deliveryResult({ delivered: true, error: '', link: link() }).text).toBe(
      'The test webhook arrived.',
    );
    expect(deliveryResult({ delivered: false, error: 'timeout', link: link() }).text).toBe(
      'The test webhook did not arrive: timeout',
    );
    const polls = link({ deliveryMode: 'polling', stateReason: 'APP_HAS_NO_WEBHOOK' });
    const error = 'the GitHub App has no webhook: Scylla polls the repository';
    expect(deliveryResult({ delivered: false, error, link: polls })).toEqual({
      delivered: false,
      text: 'The GitHub App has no webhook. Scylla polls the repository.',
    });
    expect(
      deliveryErrorText(new ScyllaError('TestDelivery is not served', { code: 'UNIMPLEMENTED' })),
    ).toBe('This server cannot test the webhook yet.');
  });

  it('gives the refusals of a link in the words of the dialog', () => {
    const refusal = (reason: string) =>
      new ScyllaError('refused', { code: 'FAILED_PRECONDITION', raw: true, reason });

    expect(linkErrorText(refusal('REPOSITORY_ALREADY_LINKED'))).toBe(
      'This project already has a repository. Unlink it first.',
    );
    expect(linkErrorText(refusal('REPOSITORY_NOT_VISIBLE'))).toBe(
      'The connection cannot see this repository.',
    );
  });

  it('describes a repository of the picker with its role and the project that has it', () => {
    const repository: ProviderRepository = {
      externalId: '9',
      fullName: 'bank/payments',
      webUrl: '',
      defaultBranch: 'main',
      private: false,
      role: 'maintainer',
      linkedProjectId: 'p-2',
    };

    expect(repositoryOptionDetails(repository, 'Mocks')).toBe(
      'Public · default branch main · Maintainer · linked to the project Mocks',
    );
    expect(repositoryOptionDetails({ ...repository, role: '' })).toBe(
      'Public · default branch main · linked to another project',
    );
  });

  it('names a new project after its repository, without the owner', () => {
    expect(repositoryName('acme/api')).toBe('api');
    expect(repositoryName('group/sub/payments')).toBe('payments');
    expect(repositoryName('solo')).toBe('solo');
  });
});
