import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { stubQuery } from '@test/queries.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient } from '@test/render.ts';
import { redirectToWorkspace } from '../workspace-redirect.effect.svelte.ts';

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

const run = () => {
  const cleanup = $effect.root(() => {
    redirectToWorkspace();
  });
  flushSync();
  cleanup();
};

beforeEach(() => {
  navigator = installTestNavigator();
  cache = withQueryClient();
  workspacesState.workspaces = undefined;
  workspacesState.isLoading = false;
  contextStore.setState({ workspace: { id: null, name: null, slug: null } });
});

afterEach(() => {
  navigator.restore();
  cache.restore();
});

describe('redirectToWorkspace', () => {
  it('waits while the workspaces are loading', () => {
    workspacesState.isLoading = true;
    run();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('goes to the projects of the active workspace', () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });
    workspacesState.workspaces = [{ id: 'org-2', name: 'Other Co', slug: 'other-co' }];
    run();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('goes to the first workspace when none is active', () => {
    workspacesState.workspaces = [
      { id: 'org-1', name: 'Globex Inc', slug: 'globex-inc' },
      { id: 'org-2', name: 'Other Co', slug: 'other-co' },
    ];
    run();

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', { replace: true });
  });

  it('stays when there is no workspace at all', () => {
    workspacesState.workspaces = [];
    run();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});
