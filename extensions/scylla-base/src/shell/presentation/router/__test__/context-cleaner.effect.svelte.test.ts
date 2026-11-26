import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { pipelineQueries } from '@base/features/pipeline';
import { workspaceQueries } from '@base/features/workspace';
import { projectQueries, type ProjectEntity } from '@base/features/project';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { textSnippet, withQueryClient, withRegistry } from '@test/render.ts';
import { cleanContext, namePipeline } from '../context-cleaner.effect.svelte.ts';
import ContextCleaner from '../ContextCleaner.wrapper.svelte';

const web: ProjectEntity = {
  id: '00000000-0000-4000-8000-0000000000a1',
  workspaceId: 'org-1',
  name: 'web',
};

const repository = { getById: vi.fn(), getByWorkspaceId: vi.fn() };

const lint = {
  pipeline: {
    id: '00000000-0000-4000-8000-0000000000c1',
    projectId: '00000000-0000-4000-8000-0000000000a1',
    name: 'lint',
    nodes: [],
  },
  layout: null,
  origin: { source: 'file' as const, filePath: '.scylla/pipelines/lint.yaml', fileErrorCount: 0 },
};

const pipelineRepository = { getWithLayout: vi.fn() };

let navigator: ReturnType<typeof installTestNavigator>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let cleanups: (() => void)[];

const settled = async () => {
  await vi.waitFor(() => expect(cache.queryClient.isFetching()).toBe(0));
  await new Promise(resolve => setTimeout(resolve));
  flushSync();
};

const mount = (
  projectId: string | undefined,
  pathname = '/acme/projects/00000000-0000-4000-8000-0000000000a1',
  params: Record<string, string> = projectId ? { projectId } : {},
) => {
  navigator.restore();
  navigator = installTestNavigator({ pathname, params });
  let cleaner!: ReturnType<typeof cleanContext>;
  cleanups.push(
    $effect.root(() => {
      cleaner = cleanContext(projectId);
    }),
  );
  flushSync();
  return cleaner;
};

const run = async (...args: Parameters<typeof mount>) => {
  const cleaner = mount(...args);
  await settled();
  return cleaner;
};

const grantInWorkspace = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'org-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

const grantProjectList = () => grantInWorkspace(Permission.LIST_PROJECTS_BY_WORKSPACE);

beforeEach(() => {
  navigator = installTestNavigator();
  cache = withQueryClient();
  cleanups = [];
  repository.getById.mockReset().mockResolvedValue(web);
  repository.getByWorkspaceId.mockReset();
  pipelineRepository.getWithLayout.mockReset().mockResolvedValue(lint);
  restoreRegistry = withRegistry({
    project: { projectRepository: repository },
    pipeline: { pipelineRepository },
  });
  grantProjectList();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: null },
    project: { id: '00000000-0000-4000-8000-0000000000a1', name: 'web' },
    pipeline: { id: null, name: null },
  });
});

afterEach(() => {
  cleanups.forEach(cleanup => cleanup());
  navigator.restore();
  cache.restore();
  restoreRegistry();
  permissionsStore.setState({ permissions: null });
});

describe('cleanContext', () => {
  it('does nothing before the server answers', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));
    contextStore.setState({ project: { id: '00000000-0000-4000-8000-0000000000a2', name: 'api' } });

    const cleaner = mount('00000000-0000-4000-8000-0000000000a1');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a2',
      name: 'api',
    });
    expect(cleaner.gone).toBe(false);
  });

  it('does nothing without a project id', async () => {
    await run(undefined);

    expect(repository.getById).not.toHaveBeenCalled();
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project.id).toBe('00000000-0000-4000-8000-0000000000a1');
  });

  it('leaves a project that still exists alone', async () => {
    const cleaner = await run('00000000-0000-4000-8000-0000000000a1');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'web',
    });
    expect(cleaner.gone).toBe(false);
  });

  it('opens a project that the first page of the list does not hold', async () => {
    repository.getByWorkspaceId.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, index) => ({ ...web, id: `other-${index}` })),
    });
    repository.getById.mockResolvedValue({
      ...web,
      id: '00000000-0000-4000-8000-0000000000b1',
      name: 'the eleventh',
    });
    contextStore.setState({ project: { id: null, name: null } });

    await run(
      '00000000-0000-4000-8000-0000000000b1',
      '/acme/projects/00000000-0000-4000-8000-0000000000b1',
    );

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000b1',
      name: 'the eleventh',
    });
  });

  it('gives the store the name of the server after a rename', async () => {
    repository.getById.mockResolvedValue({ ...web, name: 'renamed' });

    await run('00000000-0000-4000-8000-0000000000a1');

    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'renamed',
    });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('follows an answer that changes after the mount', async () => {
    await run('00000000-0000-4000-8000-0000000000a1');

    cache.queryClient.setQueryData(
      projectQueries.byId('00000000-0000-4000-8000-0000000000a1').queryKey,
      () => ({
        ...web,
        name: 'renamed in another tab',
      }),
    );

    await vi.waitFor(() =>
      expect(contextStore.getState().project.name).toBe('renamed in another tab'),
    );
  });

  it('takes the project of the URL when the store holds another project', async () => {
    contextStore.setState({ project: { id: '00000000-0000-4000-8000-0000000000a2', name: 'api' } });

    await run('00000000-0000-4000-8000-0000000000a1');

    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'web',
    });
  });

  it('fills an empty store on a direct link', async () => {
    contextStore.setState({ project: { id: null, name: null } });

    await run('00000000-0000-4000-8000-0000000000a1');

    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'web',
    });
  });

  it('writes nothing during the exit animation, when the URL left its project', async () => {
    contextStore.setState({ project: { id: '00000000-0000-4000-8000-0000000000a2', name: 'api' } });

    await run(
      '00000000-0000-4000-8000-0000000000a1',
      '/acme/projects/00000000-0000-4000-8000-0000000000a2',
      { projectId: '00000000-0000-4000-8000-0000000000a2' },
    );

    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a2',
      name: 'api',
    });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('clears the project and the pipeline and does not leave the URL when the project is gone', async () => {
    repository.getById.mockResolvedValue(null);
    contextStore.setState({ pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'ci' } });

    const cleaner = await run('00000000-0000-4000-8000-0000000000d1');

    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(cleaner.gone).toBe(true);
  });

  it('leaves at once when the cache already knows that the project is gone', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));
    cache.queryClient.setQueryData(
      projectQueries.byId('00000000-0000-4000-8000-0000000000d1').queryKey,
      null,
    );

    const cleaner = mount('00000000-0000-4000-8000-0000000000d1');

    expect(cleaner.gone).toBe(true);
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('counts a project of another workspace as gone', async () => {
    repository.getById.mockResolvedValue({ ...web, workspaceId: 'org-2' });

    const cleaner = await run('00000000-0000-4000-8000-0000000000a1');

    expect(cleaner.gone).toBe(true);
    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('stays when a person who cannot list the workspace is refused: it proves nothing', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    repository.getById.mockResolvedValue(null);

    const cleaner = await run('00000000-0000-4000-8000-0000000000a1');

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'web',
    });
  });

  it('decides when the permissions arrive after the answer', async () => {
    permissionsStore.setState({ permissions: null });
    repository.getById.mockResolvedValue(null);

    await run('00000000-0000-4000-8000-0000000000d1');
    expect(navigator.navigate).not.toHaveBeenCalled();

    grantProjectList();
    flushSync();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('waits for the workspace of the URL before it compares', async () => {
    contextStore.setState({
      workspace: { id: 'org-2', name: 'Other', slug: 'other' },
      project: { id: null, name: null },
    });

    const cleaner = await run(
      '00000000-0000-4000-8000-0000000000a1',
      '/acme-corp/projects/00000000-0000-4000-8000-0000000000a1',
      {
        workspaceSlug: 'acme-corp',
        projectId: '00000000-0000-4000-8000-0000000000a1',
      },
    );

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();

    contextStore.getState().setWorkspace('org-1', 'Acme Corp', 'acme-corp');
    flushSync();

    expect(contextStore.getState().project).toEqual({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'web',
    });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('stays on the page when the read fails for another reason', async () => {
    repository.getById.mockRejectedValue(new ScyllaError('down', { code: 'UNAVAILABLE' }));

    const cleaner = await run('00000000-0000-4000-8000-0000000000a1');

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project.id).toBe('00000000-0000-4000-8000-0000000000a1');
  });

  it('clears a stale pipeline outside the pipeline pages', async () => {
    contextStore.setState({ pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'ci' } });

    await run(
      '00000000-0000-4000-8000-0000000000a1',
      '/acme/projects/00000000-0000-4000-8000-0000000000a1/settings',
    );

    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });

  it('keeps the pipeline on its editor page', async () => {
    contextStore.setState({ pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'ci' } });

    await run(
      '00000000-0000-4000-8000-0000000000a1',
      '/acme/projects/00000000-0000-4000-8000-0000000000a1/edit/00000000-0000-4000-8000-0000000000c1',
    );

    expect(contextStore.getState().pipeline).toEqual({
      id: '00000000-0000-4000-8000-0000000000c1',
      name: 'ci',
    });
  });

  it('keeps the pipeline on any /pipelines/ page', async () => {
    contextStore.setState({ pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'ci' } });

    await run(
      '00000000-0000-4000-8000-0000000000a1',
      '/acme/projects/00000000-0000-4000-8000-0000000000a1/pipelines/00000000-0000-4000-8000-0000000000c1/jobs',
    );

    expect(contextStore.getState().pipeline).toEqual({
      id: '00000000-0000-4000-8000-0000000000c1',
      name: 'ci',
    });
  });
});

describe('namePipeline', () => {
  const jobPage =
    '/acme/projects/00000000-0000-4000-8000-0000000000a1/pipelines/00000000-0000-4000-8000-0000000000c1/jobs/job-1';
  const inJobPage = {
    projectId: '00000000-0000-4000-8000-0000000000a1',
    pipelineId: '00000000-0000-4000-8000-0000000000c1',
    jobId: 'job-1',
  };

  const runNamer = async (
    pipelineId: string | undefined,
    params: Record<string, string> = inJobPage,
  ) => {
    navigator.restore();
    navigator = installTestNavigator({ pathname: jobPage, params });
    cleanups.push($effect.root(() => namePipeline(pipelineId)));
    flushSync();
    await settled();
  };

  beforeEach(() => grantInWorkspace(Permission.READ_PIPELINE));

  it('names the pipeline of a direct link, so the crumbs do not show its id', async () => {
    await runNamer('00000000-0000-4000-8000-0000000000c1');

    expect(pipelineRepository.getWithLayout).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-0000000000c1',
    );
    expect(contextStore.getState().pipeline).toEqual({
      id: '00000000-0000-4000-8000-0000000000c1',
      name: 'lint',
    });
  });

  it('replaces another pipeline that the store kept from an earlier page', async () => {
    contextStore.setState({
      pipeline: { id: '00000000-0000-4000-8000-0000000000c2', name: 'build' },
    });

    await runNamer('00000000-0000-4000-8000-0000000000c1');

    expect(contextStore.getState().pipeline).toEqual({
      id: '00000000-0000-4000-8000-0000000000c1',
      name: 'lint',
    });
  });

  it('reads nothing when the store already names the pipeline', async () => {
    contextStore.setState({
      pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'lint' },
    });

    await runNamer('00000000-0000-4000-8000-0000000000c1');

    expect(pipelineRepository.getWithLayout).not.toHaveBeenCalled();
  });

  it('follows a rename in the cache', async () => {
    contextStore.setState({
      pipeline: { id: '00000000-0000-4000-8000-0000000000c1', name: 'lint' },
    });
    await runNamer('00000000-0000-4000-8000-0000000000c1');

    cache.queryClient.setQueryData(
      pipelineQueries.byId('00000000-0000-4000-8000-0000000000c1').queryKey,
      {
        ...lint,
        pipeline: { ...lint.pipeline, name: 'checks' },
      },
    );

    await vi.waitFor(() => expect(contextStore.getState().pipeline.name).toBe('checks'));
  });

  it('reads nothing without the right to read the pipeline: the crumbs keep its id', async () => {
    grantProjectList();

    await runNamer('00000000-0000-4000-8000-0000000000c1');

    expect(pipelineRepository.getWithLayout).not.toHaveBeenCalled();
    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });

  it('reads nothing on a page with no pipeline', async () => {
    await runNamer(undefined, { projectId: '00000000-0000-4000-8000-0000000000a1' });

    expect(pipelineRepository.getWithLayout).not.toHaveBeenCalled();
  });

  it('writes nothing during the exit animation, when the URL left its pipeline', async () => {
    await runNamer('00000000-0000-4000-8000-0000000000c1', {
      ...inJobPage,
      pipelineId: '00000000-0000-4000-8000-0000000000c2',
    });

    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });
});

describe('ContextCleaner.wrapper', () => {
  const renderWrapper = (projectId: string) => {
    navigator.restore();
    navigator = installTestNavigator({
      pathname: `/acme/projects/${projectId}`,
      params: { projectId },
    });
    render(ContextCleaner, { params: { projectId }, children: textSnippet('the page') });
  };

  it('shows the page while the answer is on the way', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));

    renderWrapper('00000000-0000-4000-8000-0000000000a1');

    expect(screen.getByText('the page')).toBeTruthy();
  });

  it('never mounts the page of a project that the cache knows is gone', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));
    cache.queryClient.setQueryData(
      projectQueries.byId('00000000-0000-4000-8000-0000000000d1').queryKey,
      null,
    );

    renderWrapper('00000000-0000-4000-8000-0000000000d1');

    expect(screen.queryByText('the page')).toBeNull();
  });

  it('takes the page away when the server says that the project is gone', async () => {
    repository.getById.mockResolvedValue(null);

    renderWrapper('00000000-0000-4000-8000-0000000000d1');
    expect(screen.getByText('the page')).toBeTruthy();

    await vi.waitFor(() => expect(screen.queryByText('the page')).toBeNull());
  });

  it('shows the not-found page, and does not redirect, for a project that is gone', async () => {
    repository.getById.mockResolvedValue(null);
    cache.queryClient.setQueryData(workspaceQueries.mine().queryKey, [
      {
        id: 'org-1',
        name: 'Acme Corp',
        slug: 'acme',
        personalTokensEnabled: false,
        timeZone: 'UTC',
      },
    ]);

    renderWrapper('00000000-0000-4000-8000-0000000000d1');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('shows the not-found page, with no request, for an id that has a wrong form', async () => {
    renderWrapper('01ZZZZZZZZZZZZZZZZZZZZZZZZ');

    await settled();

    expect(screen.queryByText('the page')).toBeNull();
    expect(repository.getById).not.toHaveBeenCalled();
  });
});
