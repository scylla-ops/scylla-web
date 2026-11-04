import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
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

const setUp = (permissions: Permission[]) => {
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
      Promise.resolve(runner === false ? [app('ci', { runner: false })] : []),
    ),
    createApp: vi.fn().mockResolvedValue({
      app: app('a2'),
      joinCode: { code: 'JOIN-42', expiresAt: '2026-01-01T01:00:00.000Z' },
      accessGranted: true,
    }),
  };
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ apps: { appsRepository: repository } })];
  render(AppsList);
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AppsList', () => {
  it('lists the apps that run no job', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);

    expect(await screen.findByText('app ci')).toBeInTheDocument();
    expect(repository.listApps).toHaveBeenCalledWith('ws-1', false);
  });

  it('opens the stepper of a new app', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE, Permission.CREATE_APP]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /New app/ }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Add an app')).toBeInTheDocument();
    expect(within(dialog).getByText('Name and roles')).toBeInTheDocument();
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
