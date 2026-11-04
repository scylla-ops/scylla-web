import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import AppsList from './AppsList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const app = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  workspaceId: 'ws-1',
  name: `app ${id}`,
  runner: true,
  connected: false,
  lastSeenAt: '',
  host: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (permissions: Permission[], kind: 'agents' | 'others' = 'agents') => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  repository = {
    listApps: vi.fn((_workspaceId: string, runner?: boolean) =>
      Promise.resolve(
        runner === false ? [app('ci', { runner: false })] : [app('a1', { connected: true })],
      ),
    ),
    createApp: vi.fn().mockResolvedValue({
      app: app('a2'),
      joinCode: { code: 'JOIN-42', expiresAt: '2026-01-01T01:00:00.000Z' },
    }),
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ apps: { appsRepository: repository } })];
  render(AppsList, { kind });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AppsList', () => {
  it('lists the agents, with their state', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);

    expect(await screen.findByText('app a1')).toBeInTheDocument();
    expect(screen.getByText(/Online/)).toBeInTheDocument();
    expect(repository.listApps).toHaveBeenCalledWith('ws-1', true);
  });

  it('lists the other apps on their page', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE], 'others');

    expect(await screen.findByText('app ci')).toBeInTheDocument();
    expect(repository.listApps).toHaveBeenCalledWith('ws-1', false);
  });

  it('creates an agent and shows the commands that join it', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE, Permission.CREATE_APP]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /New app/ }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.type(within(dialog).getByLabelText('Name'), 'builder');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(repository.createApp).toHaveBeenCalledWith('ws-1', 'builder', true));
    expect(await screen.findByText('Join the app from its machine')).toBeInTheDocument();
  });

  it('reads nothing without the right to list the apps', () => {
    setUp([]);

    expect(repository.listApps).not.toHaveBeenCalled();
  });

  it('shows the rows of the list, not an empty list, until the apps arrive', () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);
    repository.listApps.mockReturnValue(new Promise(() => {}));

    expect(document.querySelector('[data-slot="list-skeleton"]')).not.toBeNull();
    expect(screen.queryByText('No app yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
