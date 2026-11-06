import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { stubQuery } from '@test/queries.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient } from '@test/render.ts';
import { cleanContext } from '../context-cleaner.effect.svelte.ts';

const projectsState: { projects?: { id: string; name: string }[]; isLoading: boolean } = {
  projects: undefined,
  isLoading: false,
};

vi.mock('@base/features/project', () => ({
  projectQueries: {
    byWorkspace: () =>
      stubQuery(['projects'], projectsState.projects && { items: projectsState.projects }, {
        loading: projectsState.isLoading,
      }),
  },
}));

let navigator: ReturnType<typeof installTestNavigator>;
let cache: ReturnType<typeof withQueryClient>;

const run = (
  projectId: string | undefined,
  pathname = '/acme/projects/project-1',
  urlProjectId = projectId,
) => {
  navigator.restore();
  navigator = installTestNavigator({
    pathname,
    params: urlProjectId ? { projectId: urlProjectId } : {},
  });
  const cleanup = $effect.root(() => {
    cleanContext(projectId);
  });
  flushSync();
  cleanup();
};

beforeEach(() => {
  navigator = installTestNavigator();
  cache = withQueryClient();
  projectsState.projects = [{ id: 'project-1', name: 'web' }];
  projectsState.isLoading = false;
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme Corp', slug: null },
    project: { id: 'project-1', name: 'web' },
    pipeline: { id: null, name: null },
  });
});

afterEach(() => {
  navigator.restore();
  cache.restore();
});

describe('cleanContext', () => {
  it('does nothing while the projects are still loading', () => {
    projectsState.isLoading = true;
    run('project-1');

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('does nothing without a project id', () => {
    run(undefined);

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project.id).toBe('project-1');
  });

  it('leaves a project that still exists alone', () => {
    run('project-1');

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('gives the store the name of the server after a rename', () => {
    projectsState.projects = [{ id: 'project-1', name: 'renamed' }];
    run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'renamed' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('follows a list that changes after the mount', async () => {
    navigator.restore();
    navigator = installTestNavigator({ params: { projectId: 'project-1' } });
    const cleanup = $effect.root(() => {
      cleanContext('project-1');
    });
    flushSync();
    await vi.waitFor(() => expect(cache.queryClient.isFetching()).toBe(0));

    cache.queryClient.setQueryData(['projects'], {
      items: [{ id: 'project-1', name: 'renamed in another tab' }],
    });

    await vi.waitFor(() =>
      expect(contextStore.getState().project.name).toBe('renamed in another tab'),
    );
    cleanup();
  });

  it('takes the project of the URL when the store holds another project', () => {
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });
    run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('fills an empty store on a direct link', () => {
    contextStore.setState({ project: { id: null, name: null } });
    run('project-1');

    expect(contextStore.getState().project).toEqual({ id: 'project-1', name: 'web' });
  });

  it('writes nothing during the exit animation, when the URL left its project', () => {
    contextStore.setState({ project: { id: 'project-2', name: 'api' } });
    run('project-1', '/acme/projects/project-2', 'project-2');

    expect(contextStore.getState().project).toEqual({ id: 'project-2', name: 'api' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('clears the project and the pipeline and goes to the project list when the project is gone', () => {
    run('deleted-project');

    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('goes to "/" when there is no workspace name to make a slug from', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: null, slug: null } });
    run('deleted-project');

    expect(navigator.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('clears a stale pipeline outside the pipeline pages', () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });
    run('project-1', '/acme/projects/project-1/settings');

    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });

  it('keeps the pipeline on its editor page', () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });
    run('project-1', '/acme/projects/project-1/edit/pipeline-1');

    expect(contextStore.getState().pipeline).toEqual({ id: 'pipeline-1', name: 'ci' });
  });

  it('keeps the pipeline on any /pipelines/ page', () => {
    contextStore.setState({ pipeline: { id: 'pipeline-1', name: 'ci' } });
    run('project-1', '/acme/projects/project-1/pipelines/pipeline-1/jobs');

    expect(contextStore.getState().pipeline).toEqual({ id: 'pipeline-1', name: 'ci' });
  });
});
