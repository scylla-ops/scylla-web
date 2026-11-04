import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { stubQuery } from '@test/queries.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient } from '@test/render.ts';
import { syncWorkspace } from '../workspace-sync.effect.svelte.ts';

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
  contextStore.setState({ workspace: { id: null, name: null, slug: null } });
});

afterEach(() => {
  navigator.restore();
  cache.restore();
});

describe('syncWorkspace', () => {
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
