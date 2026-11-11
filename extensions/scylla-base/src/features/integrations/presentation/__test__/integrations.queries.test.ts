import { describe, it, expect, vi, afterEach } from 'vitest';
import { getQueryClient } from '@scylla/core-sdk';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { mergeBlockMutations, mergeBlockQueries } from '../merge-block.queries.ts';
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
