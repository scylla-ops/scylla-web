import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { contextStore } from '@platform/context';
import { stubQuery } from '@test/queries.ts';
import { withQueryClient } from '@test/render.ts';
import { createAdminExit, rememberWorkspacePage } from '../admin-exit.state.svelte.ts';

const workspaces = vi.hoisted(() => ({
  list: undefined as { id: string; name: string; slug: string }[] | undefined,
  last: null as string | null,
}));

vi.mock('@base/features/workspace', () => ({
  workspaceQueries: { mine: () => stubQuery(['workspaces', 'mine'], workspaces.list) },
}));

vi.mock('@base/shell/presentation/router/last-workspace.ts', () => ({
  lastWorkspaceId: () => workspaces.last,
}));

let cache: ReturnType<typeof withQueryClient>;

const exitNow = async () => {
  let exit: ReturnType<typeof createAdminExit> | undefined;
  const cleanup = $effect.root(() => {
    exit = createAdminExit();
  });
  flushSync();
  await Promise.resolve();
  flushSync();
  const read = { label: exit?.label, href: exit?.href };
  cleanup();
  return read;
};

beforeEach(() => {
  cache = withQueryClient();
  workspaces.list = undefined;
  workspaces.last = null;
  contextStore.setState({ workspace: { id: null, name: null, slug: null } });
});

afterEach(() => {
  cache.restore();
});

describe('createAdminExit', () => {
  it('goes back to the last page of the active workspace', async () => {
    contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: 'acme' } });
    rememberWorkspacePage('acme', '/acme/agents?status=online');

    expect(await exitNow()).toEqual({ label: 'Back to Acme', href: '/acme/agents?status=online' });
  });

  it('goes to the dashboard of the active workspace when its last page is of another one', async () => {
    contextStore.setState({ workspace: { id: 'org-2', name: 'Globex', slug: 'globex' } });
    rememberWorkspacePage('acme', '/acme/agents');

    expect(await exitNow()).toEqual({ label: 'Back to Globex', href: '/globex/dashboard' });
  });

  it('goes to the last workspace of the person when no workspace is active', async () => {
    workspaces.list = [
      { id: 'org-1', name: 'Acme', slug: 'acme' },
      { id: 'org-2', name: 'Globex', slug: 'globex' },
    ];
    workspaces.last = 'org-2';

    expect(await exitNow()).toEqual({ label: 'Back to Globex', href: '/globex/dashboard' });
  });

  it('goes to the choice of a workspace when the person has none', async () => {
    workspaces.list = [];

    expect(await exitNow()).toEqual({ label: 'Back', href: '/' });
  });
});
