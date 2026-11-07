import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { userState } from '@platform/user-state';
import { stubQuery } from '@test/queries.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { withQueryClient } from '@test/render.ts';
import { redirectToWorkspace } from '../workspace-redirect.effect.svelte.ts';

const server = vi.hoisted(() => ({ entries: [] as { key: string; valueJson: string; version: bigint }[] }));

vi.mock('@platform/user-state', async original => {
  const real = await original<typeof import('@platform/user-state')>();
  const client = {
    getUserState: () => ({ response: Promise.resolve({ entries: server.entries }) }),
    putUserStateEntry: vi.fn(),
  };
  return { ...real, userState: real.createUserState(client as never) };
});

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

const run = async () => {
  const cleanup = $effect.root(() => {
    redirectToWorkspace();
  });
  flushSync();
  await userState.whenLoaded();
  await Promise.resolve();
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
  it('waits while the workspaces are loading', async () => {
    workspacesState.isLoading = true;
    await run();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('goes to the projects of the active workspace', async () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });
    workspacesState.workspaces = [{ id: 'org-2', name: 'Other Co', slug: 'other-co' }];
    await run();

    expect(navigator.navigate).toHaveBeenCalledWith('/acme-corp/projects', { replace: true });
  });

  it('goes to the first workspace when none is active', async () => {
    workspacesState.workspaces = [
      { id: 'org-1', name: 'Globex Inc', slug: 'globex-inc' },
      { id: 'org-2', name: 'Other Co', slug: 'other-co' },
    ];
    await run();

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', { replace: true });
  });

  it('stays when there is no workspace at all', async () => {
    workspacesState.workspaces = [];
    await run();

    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('goes to the last workspace of the person, on the list, after a sign-out erased the context', async () => {
    server.entries = [{ key: 'last-workspace', valueJson: '{"id":"org-2"}', version: 3n }];
    userState.load('ada');
    workspacesState.workspaces = [
      { id: 'org-1', name: 'Globex Inc', slug: 'globex-inc' },
      { id: 'org-2', name: 'Other Co', slug: 'other-co' },
    ];
    await run();

    expect(navigator.navigate).toHaveBeenCalledWith('/other-co/projects', { replace: true });
  });

  it('ignores a last workspace that is not on the list of the person', async () => {
    workspacesState.workspaces = [{ id: 'org-1', name: 'Globex Inc', slug: 'globex-inc' }];
    await run();

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', { replace: true });
  });
});
