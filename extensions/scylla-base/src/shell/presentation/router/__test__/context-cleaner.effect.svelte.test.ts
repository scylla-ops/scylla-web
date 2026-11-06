import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { projectQueries, type ProjectEntity } from '@base/features/project';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { textSnippet, withQueryClient, withRegistry } from '@test/render.ts';
import { cleanContext } from '../context-cleaner.effect.svelte.ts';
import ContextCleaner from '../ContextCleaner.wrapper.svelte';

const web: ProjectEntity = { id: 'project-1', workspaceId: 'org-1', name: 'web' };

const repository = { getById: vi.fn(), getByWorkspaceId: vi.fn() };

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
  pathname = '/acme/projects/project-1',
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

const grantProjectList = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'org-1',
          access: { kind: 'restricted', permissions: [Permission.LIST_PROJECTS_BY_WORKSPACE] },
        },
      ],
    },
  });

beforeEach(() => {
  navigator = installTestNavigator();
  cache = withQueryClient();
  cleanups = [];
  repository.getById.mockReset().mockResolvedValue(web);
  repository.getByWorkspaceId.mockReset();
  restoreRegistry = withRegistry({ project: { projectRepository: repository } });
  grantProjectList();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: null },
    project: { id: 'project-1', name: 'web' },
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
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });

    const cleaner = mount('project-1');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({ id: 'project-2', name: 'api' });
    expect(cleaner.gone).toBe(false);
  });

  it('does nothing without a project id', async () => {
    await run(undefined);

    expect(repository.getById).not.toHaveBeenCalled();
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project.id).toBe('project-1');
  });

  it('leaves a project that still exists alone', async () => {
    const cleaner = await run('project-1');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
    expect(cleaner.gone).toBe(false);
  });

  it('opens a project that the first page of the list does not hold', async () => {
    repository.getByWorkspaceId.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, index) => ({ ...web, id: `other-${index}` })),
    });
    repository.getById.mockResolvedValue({ ...web, id: 'project-11', name: 'the eleventh' });
    contextStore.setState({ project: { id: null, name: null } });

    await run('project-11', '/acme/projects/project-11');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({ id: 'project-11', name: 'the eleventh' });
  });

  it('gives the store the name of the server after a rename', async () => {
    repository.getById.mockResolvedValue({ ...web, name: 'renamed' });

    await run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'renamed' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('follows an answer that changes after the mount', async () => {
    await run('project-1');

    cache.queryClient.setQueryData(projectQueries.byId('project-1').queryKey, () => ({
      ...web,
      name: 'renamed in another tab',
    }));

    await vi.waitFor(() =>
      expect(contextStore.getState().project.name).toBe('renamed in another tab'),
    );
  });

  it('takes the project of the URL when the store holds another project', async () => {
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });

    await run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('fills an empty store on a direct link', async () => {
    contextStore.setState({ project: { id: null, name: null } });

    await run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('writes nothing during the exit animation, when the URL left its project', async () => {
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });

    await run('project-1', '/acme/projects/project-2', { projectId: 'project-2' });

    expect(contextStore.getState().project).toEqual({ id: 'project-2', name: 'api' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('clears the project and the pipeline and goes to the project list when the project is gone', async () => {
    repository.getById.mockResolvedValue(null);
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });

    const cleaner = await run('deleted-project');

    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
    expect(cleaner.gone).toBe(true);
  });

  it('leaves at once when the cache already knows that the project is gone', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));
    cache.queryClient.setQueryData(projectQueries.byId('deleted-project').queryKey, null);

    const cleaner = mount('deleted-project');

    expect(cleaner.gone).toBe(true);
    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('goes to "/" when there is no workspace name to make a slug from', async () => {
    repository.getById.mockResolvedValue(null);
    contextStore.setState({ workspace: { id: 'org-1', name: null, slug: null } });

    await run('deleted-project');

    expect(navigator.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('counts a project of another workspace as gone', async () => {
    repository.getById.mockResolvedValue({ ...web, workspaceId: 'org-2' });

    const cleaner = await run('project-1');

    expect(cleaner.gone).toBe(true);
    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('stays when a person who cannot list the workspace is refused: it proves nothing', async () => {
    permissionsStore.setState({ permissions: { scopes: [] } });
    repository.getById.mockResolvedValue(null);

    const cleaner = await run('project-1');

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('decides when the permissions arrive after the answer', async () => {
    permissionsStore.setState({ permissions: null });
    repository.getById.mockResolvedValue(null);

    await run('deleted-project');
    expect(navigator.navigate).not.toHaveBeenCalled();

    grantProjectList();
    flushSync();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('waits for the workspace of the URL before it compares', async () => {
    contextStore.setState({
      workspace: { id: 'org-2', name: 'Other', slug: 'other' },
      project: { id: null, name: null },
    });

    const cleaner = await run('project-1', '/acme-corp/projects/project-1', {
      workspaceSlug: 'acme-corp',
      projectId: 'project-1',
    });

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();

    contextStore.getState().setWorkspace('org-1', 'Acme Corp', 'acme-corp');
    flushSync();

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('stays on the page when the read fails for another reason', async () => {
    repository.getById.mockRejectedValue(new ScyllaError('down', { code: 'UNAVAILABLE' }));

    const cleaner = await run('project-1');

    expect(cleaner.gone).toBe(false);
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project.id).toBe('project-1');
  });

  it('clears a stale pipeline outside the pipeline pages', async () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });

    await run('project-1', '/acme/projects/project-1/settings');

    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });

  it('keeps the pipeline on its editor page', async () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });

    await run('project-1', '/acme/projects/project-1/edit/pipeline-1');

    expect(contextStore.getState().pipeline).toEqual({ id: 'pipeline-1', name: 'ci' });
  });

  it('keeps the pipeline on any /pipelines/ page', async () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });

    await run('project-1', '/acme/projects/project-1/pipelines/pipeline-1/jobs');

    expect(contextStore.getState().pipeline).toEqual({ id: 'pipeline-1', name: 'ci' });
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

    renderWrapper('project-1');

    expect(screen.getByText('the page')).toBeTruthy();
  });

  it('never mounts the page of a project that the cache knows is gone', () => {
    repository.getById.mockReturnValue(new Promise(() => {}));
    cache.queryClient.setQueryData(projectQueries.byId('deleted-project').queryKey, null);

    renderWrapper('deleted-project');

    expect(screen.queryByText('the page')).toBeNull();
  });

  it('takes the page away when the server says that the project is gone', async () => {
    repository.getById.mockResolvedValue(null);

    renderWrapper('deleted-project');
    expect(screen.getByText('the page')).toBeTruthy();

    await vi.waitFor(() => expect(screen.queryByText('the page')).toBeNull());
  });
});
