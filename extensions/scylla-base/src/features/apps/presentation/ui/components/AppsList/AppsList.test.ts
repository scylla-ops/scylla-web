import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import AppsList from './AppsList.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const app = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  workspaceId: 'ws-1',
  name: id,
  runner: false,
  connected: false,
  lastSeenAt: '',
  host: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
  ...overrides,
});

const token = (overrides: Record<string, unknown> = {}) => ({
  id: 't-1',
  name: 'deploy-script',
  hint: 'scya_...',
  createdBy: 'u-1',
  createdAt: at(-1),
  expiresAt: at(9.2),
  lastUsedAt: at(-0.1),
  revokedAt: '',
  limits: { preset: 'deploy', actions: [], projectIds: [] },
  ...overrides,
});

const identity = {
  id: 'ci-1',
  provider: 'github',
  issuer: '',
  repository: 'acme/api',
  gitRef: 'refs/heads/main',
  environment: '',
  limits: { preset: 'full', actions: [], projectIds: [] },
  createdAt: at(-2),
  lastUsedAt: '',
};

const ALL = [
  Permission.LIST_APPS_BY_WORKSPACE,
  Permission.READ_APP,
  Permission.CREATE_APP,
  Permission.DELETE_APP,
  Permission.LIST_WORKSPACE_MEMBERS,
];

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;
let access: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (permissions: Permission[], apps: ReturnType<typeof app>[] = []) => {
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
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
  repository = {
    listApps: vi.fn().mockResolvedValue(apps),
    getApp: vi.fn((id: string) => Promise.resolve({ app: app(id), keys: [] })),
    listTokens: vi.fn().mockResolvedValue([]),
    listCiIdentities: vi.fn().mockResolvedValue([]),
    deleteApp: vi.fn().mockResolvedValue(undefined),
    disableApp: vi.fn().mockResolvedValue(app('x')),
  };
  access = { listAccess: vi.fn().mockResolvedValue([]) };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, total: 0 },
    }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      apps: { appsRepository: repository },
      access: { accessRepository: access },
      project: { projectRepository: projects },
    }),
  ];
};

const rowOf = async (name: string) => {
  const cell = await screen.findByRole('button', { name });
  return within(cell.closest('tr') as HTMLElement);
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AppsList', () => {
  it('lists the apps that run no job', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE], [app('ci')]);
    render(AppsList);

    expect(await screen.findByRole('button', { name: 'ci' })).toBeInTheDocument();
    expect(repository.listApps).toHaveBeenCalledWith('ws-1', false);
  });

  it('shows on each line the credential that needs attention, the access and the last use', async () => {
    setUp(ALL, [app('release-bot')]);
    repository.listTokens.mockResolvedValue([token()]);
    repository.listCiIdentities.mockResolvedValue([identity]);
    access.listAccess.mockResolvedValue([{ actorId: 'release-bot', role: 'member' }]);
    render(AppsList);

    const row = await rowOf('release-bot');
    const summary = await row.findByText('API token · Deploy · expires in 9 days');
    expect(summary.closest('span.flex')).toHaveClass('text-warning');
    expect(row.getByText('+1')).toBeInTheDocument();
    expect(await row.findByText('Member of acme')).toBeInTheDocument();
    expect(row.getByText(/hr. ago/)).toBeInTheDocument();
  });

  it('marks an expired token and a disabled app', async () => {
    setUp(ALL, [app('old-ci', { disabledAt: at(-1) })]);
    repository.listTokens.mockResolvedValue([token({ expiresAt: at(-3) })]);
    render(AppsList);

    const row = await rowOf('old-ci');
    expect(row.getByText('Disabled')).toBeInTheDocument();
    const summary = await row.findByText(/API token · expired on/);
    expect(summary.closest('span.flex')).toHaveClass('text-destructive');
  });

  it('shows a CI identity with its repository and its branch', async () => {
    setUp(ALL, [app('github-actions')]);
    repository.listCiIdentities.mockResolvedValue([identity]);
    render(AppsList);

    const row = await rowOf('github-actions');
    expect(await row.findByText('CI identity · acme/api on main')).toBeInTheDocument();
    expect(row.getByText('Never')).toBeInTheDocument();
  });

  it('says so for an app with no credential and no role', async () => {
    setUp(ALL, [app('new-one')]);
    render(AppsList);

    const row = await rowOf('new-one');
    expect(await row.findByText('No credential')).toBeInTheDocument();
    expect(await row.findByText('No role')).toBeInTheDocument();
  });

  it('shows no error for an app that the user may not read', async () => {
    setUp(ALL, [app('secret')]);
    repository.getApp.mockRejectedValue(new ScyllaError('no', { code: 'PERMISSION_DENIED' }));
    render(AppsList);

    const row = await rowOf('secret');
    await waitFor(() => expect(row.getAllByText('–').length).toBe(2));
    expect(screen.queryByText('No credential')).not.toBeInTheDocument();
  });

  it('hides the access column without the right to read the members', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE, Permission.READ_APP], [app('ci')]);
    render(AppsList);

    await screen.findByRole('button', { name: 'ci' });
    expect(screen.queryByRole('columnheader', { name: 'Access' })).not.toBeInTheDocument();
    expect(access.listAccess).not.toHaveBeenCalled();
  });

  it('deletes an app from its menu after a confirmation', async () => {
    setUp(ALL, [app('ci')]);
    render(AppsList);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Actions of ci' }));
    await user.click(await findFloating('menuitem', 'Delete'));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Delete ci?')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(repository.deleteApp).toHaveBeenCalledWith('ci'));
  });

  it('offers the first app to a user who may create one', async () => {
    setUp(ALL);
    render(AppsList);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Add your first app' })).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /Add an app/ });
    await user.click(buttons[buttons.length - 1]);
    const dialog = await screen.findByRole('dialog');
    await focusSettled();

    expect(within(dialog).getByText('Name and roles')).toBeInTheDocument();
  });

  it('says who can create an app to a user who may not', async () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);
    render(AppsList);

    expect(await screen.findByRole('heading', { name: 'No app yet' })).toBeInTheDocument();
    expect(screen.getByText(/Admins of acme can create apps/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add an app/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('reads nothing without the right to list the apps', () => {
    setUp([]);
    render(AppsList);

    expect(repository.listApps).not.toHaveBeenCalled();
  });

  it('shows the rows of the list, not an empty list, until the apps arrive', () => {
    setUp([Permission.LIST_APPS_BY_WORKSPACE]);
    repository.listApps.mockReturnValue(new Promise(() => {}));
    render(AppsList);

    expect(document.querySelector('[data-slot="list-skeleton"]')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'No app yet' })).not.toBeInTheDocument();
  });
});

const onAPhone = () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('AppsList on a phone', () => {
  it('shows cards, not a table, with the same facts', async () => {
    onAPhone();
    setUp(ALL, [app('release-bot', { disabledAt: at(-1) })]);
    repository.listTokens.mockResolvedValue([token()]);
    access.listAccess.mockResolvedValue([{ actorId: 'release-bot', role: 'member' }]);
    render(AppsList);

    expect(await screen.findByRole('button', { name: 'release-bot' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(await screen.findByText('API token · Deploy · expires in 9 days')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(await screen.findByText(/^Member of acme · Last used /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions of release-bot' })).toBeInTheDocument();
  });

  it('says so when the app never did a call', async () => {
    onAPhone();
    setUp(ALL, [app('release-bot')]);
    repository.listTokens.mockResolvedValue([token({ lastUsedAt: '' })]);
    render(AppsList);

    expect(await screen.findByText('Never used')).toBeInTheDocument();
  });
});
