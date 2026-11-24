import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { toast } from 'svelte-sonner';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import AppDetails from './AppDetails.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const app = {
  id: '01JC3NAAAAAAAAAAAAAAAA8QW',
  workspaceId: 'ws-1',
  name: 'release-bot',
  runner: false,
  connected: false,
  lastSeenAt: '',
  host: null,
  createdAt: '2026-11-02T00:00:00.000Z',
  runningJobs: 0,
  disabledAt: '',
};

const limits = { preset: 'deploy' as const, actions: [], projectIds: [] };

const token = {
  id: 't-1',
  name: 'deploy-script',
  hint: 'scya_7Hq2…',
  createdBy: 'u-1',
  createdAt: at(-1),
  expiresAt: at(9.2),
  lastUsedAt: at(-0.1),
  revokedAt: '',
  limits,
};

const identity = {
  id: 'ci-1',
  provider: 'github' as const,
  issuer: '',
  repository: 'acme/release-tools',
  gitRef: 'refs/heads/main',
  environment: '',
  limits: { preset: 'full' as const, actions: [], projectIds: [] },
  createdAt: at(-2),
  lastUsedAt: at(-0.01),
};

const ALL = [
  Permission.READ_APP,
  Permission.CREATE_APP,
  Permission.DELETE_APP,
  Permission.LIST_WORKSPACE_MEMBERS,
];

let teardown: Array<() => void> = [];
let apps: Record<string, ReturnType<typeof vi.fn>>;
let navigate: ReturnType<typeof vi.fn>;

const setUp = (permissions = ALL) => {
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
  apps = {
    getApp: vi.fn().mockResolvedValue({
      app,
      keys: [
        {
          id: 'k-01JC3P2X9D',
          label: 'backup-01.acme.lan',
          createdAt: at(-2),
          revokedAt: '',
          lastUsedAt: '',
        },
      ],
    }),
    listTokens: vi.fn().mockResolvedValue([token]),
    listCiIdentities: vi.fn().mockResolvedValue([identity]),
    revokeToken: vi.fn().mockResolvedValue(undefined),
    createToken: vi
      .fn()
      .mockResolvedValue({ token: { ...token, id: 't-2', name: 'nightly' }, secret: 'scya_NEW' }),
    deleteApp: vi.fn().mockResolvedValue(undefined),
  };
  const access = { listAccess: vi.fn().mockResolvedValue([]) };
  const projects = {
    getByWorkspaceId: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, total: 0 },
    }),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/apps/x' });
  navigate = navigator.navigate;
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      apps: { appsRepository: apps },
      access: { accessRepository: access },
      project: { projectRepository: projects },
    }),
  ];
  return render(AppDetails, { appId: app.id });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('AppDetails', () => {
  it('lists the credentials of the app, with their expiry and their last use', async () => {
    setUp();

    expect(await screen.findByRole('heading', { name: 'release-bot' })).toBeInTheDocument();
    expect(await screen.findByText('deploy-script')).toBeInTheDocument();
    expect(screen.getByText('Expires in 9 days')).toBeInTheDocument();
    expect(screen.getByText('Deploy · all projects')).toBeInTheDocument();
    expect(await screen.findByText('acme/release-tools')).toBeInTheDocument();
    expect(screen.getByText('branch main')).toBeInTheDocument();
    expect(screen.getByText('No secret to expire')).toBeInTheDocument();
    expect(screen.getByText('backup-01.acme.lan')).toBeInTheDocument();
    expect(screen.getByText('No expiry')).toBeInTheDocument();
    expect(screen.getByText('With CI identity (OIDC) GitHub Actions.')).toBeInTheDocument();
  });

  it('ends with a space under the last card, above a floating button at the bottom right', async () => {
    const { container } = setUp();

    await screen.findByRole('heading', { name: 'release-bot' });

    expect(container.firstElementChild).toHaveClass('pb-20');
  });

  it('revokes a token after a confirmation', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Actions of deploy-script' }));
    await user.click(await findFloating('menuitem', 'Revoke'));
    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Revoke deploy-script?')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(apps.revokeToken).toHaveBeenCalledWith(app.id, 't-1'));
  });

  it('adds an API token and shows its secret once', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add a credential' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.click(within(dialog).getByRole('button', { name: 'Next' }));
    await user.type(await within(dialog).findByLabelText('Token name'), 'nightly');
    await user.click(within(dialog).getByRole('button', { name: 'Create token' }));

    await waitFor(() =>
      expect(apps.createToken).toHaveBeenCalledWith(app.id, {
        name: 'nightly',
        expiry: 90,
        limits: { preset: 'read_only', actions: [], projectIds: [] },
      }),
    );
    expect(await within(dialog).findByText('scya_NEW')).toBeInTheDocument();
  });

  it('deletes the app only after its name is typed', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete app' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.type(within(dialog).getByLabelText('Type release-bot to confirm'), 'release-bot');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(apps.deleteApp).toHaveBeenCalledWith(app.id));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('App deleted'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/apps', undefined));
  });

  it('asks nothing more about the app after its delete: the server would refuse', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete app' }));
    const dialog = await screen.findByRole('dialog');
    await focusSettled();
    await user.type(within(dialog).getByLabelText('Type release-bot to confirm'), 'release-bot');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/apps', undefined));

    expect(apps.getApp).toHaveBeenCalledTimes(1);
    expect(apps.listTokens).toHaveBeenCalledTimes(1);
    expect(apps.listCiIdentities).toHaveBeenCalledTimes(1);
  });

  it('hides the actions that the user may not use', async () => {
    setUp([Permission.READ_APP]);

    expect(await screen.findByText('deploy-script')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a credential' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions of deploy-script' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete app' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
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

describe('AppDetails on a phone', () => {
  it('lists the credentials as cards, with their actions, and no table', async () => {
    onAPhone();
    setUp();

    expect(await screen.findByText('Deploy · all projects')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions of deploy-script' })).toBeInTheDocument();
  });
});
