import { describe, it, expect, vi, afterEach } from 'vitest';
import { getQueryClient } from '@scylla/core-sdk';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import type { ProviderRepositoryPage } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import { mergeBlockMutations, mergeBlockQueries } from '../merge-block.queries.ts';
import { pipelineSourceMutations, pipelineSourceQueries } from '../pipeline-source.queries.ts';
import { repositoryLinkMutations, repositoryLinkQueries } from '../repository-link.queries.ts';
import { vcsConnectionMutations, vcsConnectionQueries } from '../vcs-connection.queries.ts';
import { MAX_JOBS_PER_REPORT_CALL, vcsReportQueries } from '../vcs-report.queries.ts';

let teardown: Array<() => void> = [];

const install = (domain: Record<string, Record<string, ReturnType<typeof vi.fn>>>) => {
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ integrations: domain })];
};

afterEach(() => {
  teardown.forEach(restore => restore());
  vi.unstubAllGlobals();
});

describe('integrations queries', () => {
  it('reads the connections and the providers of the workspace, and waits for a workspace', async () => {
    const listByWorkspace = vi.fn().mockResolvedValue([]);
    install({ vcsConnectionRepository: { listByWorkspace } });

    expect(vcsConnectionQueries.byWorkspace('').enabled).toBe(false);
    expect(vcsConnectionQueries.providers('').enabled).toBe(false);
    await runQueryFn(vcsConnectionQueries.byWorkspace('ws-1'));
    expect(listByWorkspace).toHaveBeenCalledWith('ws-1');
  });

  it('refreshes the connections of the workspace after a new GitLab connection', async () => {
    const connectGitLab = vi.fn().mockResolvedValue({ connection: {}, warnings: [] });
    install({ vcsConnectionRepository: { connectGitLab } });
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries');
    const options = vcsConnectionMutations.connectGitLab();
    const input = { workspaceId: 'ws-1', token: 'glpat-1' };

    const result = await runMutationFn(options, input);
    runOnSuccess(options, result, input);

    expect(options.meta).toEqual({ showsOwnError: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vcs-connections', 'ws-1'] });
  });

  it('sends the browser to the install page of GitHub', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const startGitHubInstall = vi
      .fn()
      .mockResolvedValue({
        installUrl: 'https://github.com/apps/scylla/installations/new',
        expiresAt: '',
      });
    install({ vcsConnectionRepository: { startGitHubInstall } });
    const options = vcsConnectionMutations.startGitHubInstall();

    const result = await runMutationFn(options, 'ws-1');
    runOnSuccess(options, result, 'ws-1');

    expect(assign).toHaveBeenCalledWith('https://github.com/apps/scylla/installations/new');
  });

  it('refreshes the link, the merge rules and the connections after a link', async () => {
    const link = vi.fn().mockResolvedValue({ projectId: 'p-1' });
    install({ repositoryLinkRepository: { link } });
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries');
    const options = repositoryLinkMutations.link();
    const input = { projectId: 'p-1', connectionId: 'c-1', externalId: '7' };

    runOnSuccess(options, await runMutationFn(options, input), input);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['repository-link', 'p-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['merge-blocks', 'p-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vcs-connections'] });
    expect(repositoryLinkQueries.byProject('').enabled).toBe(false);
  });

  it('lets the repository page show the refusal of a link and the result of a test webhook', () => {
    expect(repositoryLinkMutations.link().meta).toEqual({ showsOwnError: true });
    expect(repositoryLinkMutations.testDelivery().meta).toEqual({ showsOwnError: true });
    expect(repositoryLinkMutations.update().meta).toBeUndefined();
    expect(mergeBlockQueries.byProject('p-1', false).enabled).toBe(false);
    expect(vcsConnectionQueries.byWorkspace('ws-1', false).enabled).toBe(false);
  });

  it('keeps the rows of the last search of the same connection, not of another one', () => {
    const page: ProviderRepositoryPage = { repositories: [], nextPageToken: '' };
    const options = vcsConnectionQueries.repositories({
      projectId: 'p-1',
      connectionId: 'c-1',
      search: 'api',
    });
    const placeholder = options.placeholderData as unknown as (
      previous: ProviderRepositoryPage,
      query: { queryKey: readonly unknown[] },
    ) => ProviderRepositoryPage | undefined;
    const keyOf = (connectionId: string) =>
      vcsConnectionQueries.repositories({ projectId: 'p-1', connectionId }).queryKey;

    expect(placeholder(page, { queryKey: keyOf('c-1') })).toBe(page);
    expect(placeholder(page, { queryKey: keyOf('c-2') })).toBeUndefined();
  });

  it('refreshes the merge rules of the project after a change', async () => {
    const set = vi.fn().mockResolvedValue({ projectId: 'p-1' });
    install({ mergeBlockRepository: { set } });
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries');
    const options = mergeBlockMutations.set();
    const input = { projectId: 'p-1', pipelineId: 'pl-1', enabled: true };

    runOnSuccess(options, await runMutationFn(options, input), input);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['merge-blocks', 'p-1'] });
    expect(mergeBlockQueries.byProject('p-1').queryKey).toEqual(['merge-blocks', 'p-1']);
  });

  it('puts the rule of the answer in its row at once, and keeps the other rows', async () => {
    const answer = { projectId: 'p-1', pipelineId: 'pl-2', enabled: true, state: 'on' };
    const set = vi.fn().mockResolvedValue(answer);
    install({ mergeBlockRepository: { set } });
    const rows = [
      { projectId: 'p-1', pipelineId: 'pl-1', enabled: false, state: 'off' },
      { projectId: 'p-1', pipelineId: 'pl-2', enabled: false, state: 'off' },
    ];
    getQueryClient().setQueryData(['merge-blocks', 'p-1'], rows);
    const options = mergeBlockMutations.set();
    const input = { projectId: 'p-1', pipelineId: 'pl-2', enabled: true };

    runOnSuccess(options, await runMutationFn(options, input), input);

    expect(getQueryClient().getQueryData(['merge-blocks', 'p-1'])).toEqual([rows[0], answer]);
  });

  it('refreshes the link, the merge rules, the pipelines and the triggers after a move', async () => {
    const setSource = vi.fn().mockResolvedValue(undefined);
    install({ pipelineSourceRepository: { setSource } });
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries');
    const options = pipelineSourceMutations.set();
    const input = { projectId: 'p-1', source: 'file' as const };

    runOnSuccess(options, await runMutationFn(options, input), input);

    expect(setSource).toHaveBeenCalledWith(input);
    expect(options.meta).toEqual({ showsOwnError: true });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['repository-link', 'p-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['merge-blocks', 'p-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelines'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipeline'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['triggers'] });
  });

  it('reads the files under the key of the link, and waits for a project', async () => {
    const listFiles = vi.fn().mockResolvedValue({ commitSha: '', files: [], issues: [] });
    install({ pipelineSourceRepository: { listFiles } });

    expect(pipelineSourceQueries.files('').enabled).toBe(false);
    expect(pipelineSourceQueries.files('p-1', false).enabled).toBe(false);
    expect(pipelineSourceQueries.files('p-1').queryKey).toEqual([
      'repository-link',
      'p-1',
      'pipeline-files',
    ]);
    await runQueryFn(pipelineSourceQueries.files('p-1'));
    expect(listFiles).toHaveBeenCalledWith('p-1');
  });

  it('shares one entry for the same jobs in another order, and asks for at most 100 jobs', async () => {
    const listByJobs = vi.fn().mockResolvedValue([]);
    install({ vcsReportRepository: { listByJobs } });
    const ids = Array.from({ length: 120 }, (_, index) => `j-${String(index).padStart(3, '0')}`);

    expect(vcsReportQueries.byJobs(['j-2', 'j-1']).queryKey).toEqual(
      vcsReportQueries.byJobs(['j-1', 'j-2']).queryKey,
    );
    expect(vcsReportQueries.byJobs([]).enabled).toBe(false);
    await runQueryFn(vcsReportQueries.byJobs(ids));
    expect(listByJobs.mock.calls[0][0]).toHaveLength(MAX_JOBS_PER_REPORT_CALL);
  });
});

describe('the link queries that the pipeline pages read', () => {
  const grant = (permissions: Permission[]) =>
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.PROJECT,
            scopeId: 'p-1',
            access: { kind: 'restricted', permissions },
          },
        ],
      },
    });

  afterEach(() => permissionsStore.setState({ permissions: null }));

  it('read the link and its refs only with READ_REPOSITORY_LINK on the project: they run outside the route guard', () => {
    grant([Permission.LIST_JOBS_BY_PIPELINE]);
    expect(repositoryLinkQueries.byProject('p-1').enabled).toBe(false);
    expect(repositoryLinkQueries.refs({ projectId: 'p-1' }).enabled).toBe(false);

    grant([Permission.READ_REPOSITORY_LINK]);
    expect(repositoryLinkQueries.byProject('p-1').enabled).toBe(true);
    expect(repositoryLinkQueries.refs({ projectId: 'p-1' }).enabled).toBe(true);
    expect(repositoryLinkQueries.refs({ projectId: 'p-1' }, false).enabled).toBe(false);
  });
});

describe('the reports that the pages of the jobs read', () => {
  afterEach(() => permissionsStore.setState({ permissions: null }));

  it('read the reports only with READ_JOB: they run outside the route guard', () => {
    const grant = (permissions: Permission[]) =>
      permissionsStore.setState({
        permissions: {
          scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } }],
        },
      });

    grant([Permission.READ_REPOSITORY_LINK]);
    expect(vcsReportQueries.byJobs(['j-1']).enabled).toBe(false);

    grant([Permission.READ_JOB]);
    expect(vcsReportQueries.byJobs(['j-1']).enabled).toBe(true);
    expect(vcsReportQueries.byJobs(['j-1'], false).enabled).toBe(false);
  });
});
