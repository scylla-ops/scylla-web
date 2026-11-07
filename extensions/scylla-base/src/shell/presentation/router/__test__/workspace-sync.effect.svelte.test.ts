import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { stubQuery } from '@test/queries.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient } from '@test/render.ts';
import { syncWorkspace } from '../workspace-sync.effect.svelte.ts';

const rememberWorkspace = vi.hoisted(() => vi.fn());

vi.mock('../last-workspace.ts', () => ({ rememberWorkspace }));

const workspacesState: { workspaces?: { id: string; name: string; slug: string }[]; isLoading: boolean } = {
  workspaces: undefined,
  isLoading: false,
};

vi.mock('@base/features/workspace', () => ({
  workspaceQueries: {
    mine: () =>
      stubQuery(['workspaces', 'mine'], workspacesState.workspaces, {
        loading: workspacesState.isLoading,
      }),
  },
}));

let navigator: ReturnType<typeof installTestNavigator>;
let cache: ReturnType<typeof withQueryClient>;

const run = (slug: string | undefined) => {
  const cleanup = $effect.root(() => {
    syncWorkspace(slug);
  });
  flushSync();
  return cleanup;
};

beforeEach(() => {
  navigator = installTestNavigator();
  cache = withQueryClient();
  workspacesState.workspaces = [
    { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
    { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' },
  ];
  workspacesState.isLoading = false;
  rememberWorkspace.mockClear();
  contextStore.setState({
    workspace: { id: null, name: null, slug: null },
    project: { id: null, name: null },
    pipeline: { id: null, name: null },
  });
});

afterEach(() => {
  navigator.restore();
  cache.restore();
});

describe('syncWorkspace', () => {
  it('remembers a workspace of the list, also with no change in the store', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });

    run('acme-corp')();

    expect(rememberWorkspace).toHaveBeenCalledWith('org-1');
  });

  it('does not remember a slug that is not on the list of the person', () => {
    run('someone-else')();

    expect(rememberWorkspace).not.toHaveBeenCalled();
  });

  it('does nothing without a slug', () => {
    run(undefined)();

    expect(contextStore.getState().workspace.id).toBeNull();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('does nothing while the workspaces are still loading', () => {
    workspacesState.isLoading = true;
    run('acme-corp')();

    expect(contextStore.getState().workspace.id).toBeNull();
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('makes the workspace that matches the slug the active one', () => {
    run('globex-inc')();

    expect(contextStore.getState().workspace).toEqual({ id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('does not set the store again when the matched workspace is already active', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });
    const setWorkspace = vi.spyOn(contextStore.getState(), 'setWorkspace');

    run('acme-corp')();

    expect(setWorkspace).not.toHaveBeenCalled();
  });

  it('takes the new name of the active workspace and keeps the project and the pipeline', () => {
    contextStore.setState({
      workspace: { id: 'org-1', name: 'Old name', slug: 'acme-corp' },
      project: { id: 'project-1', name: 'Web' },
      pipeline: { id: 'pipeline-1', name: 'Deploy' },
    });

    run('acme-corp')();

    const { workspace, project, pipeline } = contextStore.getState();
    expect(workspace).toEqual({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
    expect(project).toEqual({ id: 'project-1', name: 'Web' });
    expect(pipeline).toEqual({ id: 'pipeline-1', name: 'Deploy' });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('follows a rename that arrives after the mount, when the list refetches', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });
    const cleanup = run('acme-corp');

    cache.queryClient.setQueryData(
      ['workspaces', 'mine'],
      [{ id: 'org-1', name: 'Renamed', slug: 'acme-corp' }],
    );
    flushSync();
    cleanup();

    expect(contextStore.getState().workspace.name).toBe('Renamed');
  });

  it('opens the same page under the new slug when the active workspace changes its slug', () => {
    navigator.restore();
    navigator = installTestNavigator({
      pathname: '/old-slug/projects/project-1/secrets',
      search: '?page=2',
    });
    contextStore.setState({
      workspace: { id: 'org-2', name: 'Old name', slug: 'old-slug' },
      project: { id: 'project-1', name: 'Web' },
    });

    run('old-slug')();

    const { workspace, project } = contextStore.getState();
    expect(workspace).toEqual({ id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' });
    expect(project).toEqual({ id: 'project-1', name: 'Web' });
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects/project-1/secrets?page=2', {
      replace: true,
    });
  });

  it('goes to the first workspace when the active workspace is gone', () => {
    contextStore.setState({ workspace: { id: 'org-deleted', name: 'Gone', slug: 'gone' } });

    run('gone')();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
    expect(contextStore.getState().workspace).toEqual({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
  });

  it('goes to the first workspace when the slug is not the one of the active workspace', () => {
    contextStore.setState({ workspace: { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' } });

    run('no-such-org')();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('goes to the first workspace when the slug matches none', () => {
    run('no-such-org')();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
    expect(contextStore.getState().workspace).toEqual({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
  });

  it('does nothing when the slug matches none and there is no workspace', () => {
    workspacesState.workspaces = [];
    run('no-such-org')();

    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(contextStore.getState().workspace.id).toBeNull();
  });
});
