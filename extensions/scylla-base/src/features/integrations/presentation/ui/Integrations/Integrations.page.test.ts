import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import type { VcsProviderInfo } from '@base/features/integrations/domain/structs/vcs-provider.struct.ts';
import IntegrationsPage from './Integrations.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const connection = (patch: Partial<VcsConnectionEntity> = {}): VcsConnectionEntity => ({
  id: 'c-1',
  workspaceId: 'ws-1',
  provider: 'github',
  account: 'acme',
  accountKind: 'organization',
  avatarUrl: '',
  state: 'active',
  stateReason: '',
  deliveryMode: 'webhook',
  pollIntervalSeconds: 120,
  allRepositories: false,
  repositoryCount: 12,
  projectCount: 4,
  scopes: [],
  missingPermissions: [],
  settingsUrl: 'https://github.com/organizations/acme/settings/installations/1',
  createdBy: 'u-1',
  createdAt: new Date(Date.now() - 120_000).toISOString(),
  ...patch,
});

const PROVIDERS: VcsProviderInfo[] = [
  { provider: 'github', available: true, unavailableReason: '', webUrl: 'https://github.com' },
  { provider: 'gitlab', available: true, unavailableReason: '', webUrl: 'https://gitlab.com' },
];

let teardown: Array<() => void> = [];
let repository: Record<string, ReturnType<typeof vi.fn>>;
let navigate: ReturnType<typeof installTestNavigator>['navigate'];

const setUp = (
  permissions: Permission[],
  {
    connections = [] as VcsConnectionEntity[],
    providers = PROVIDERS,
    search = '',
  }: { connections?: VcsConnectionEntity[]; providers?: VcsProviderInfo[]; search?: string } = {},
) => {
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
    getProviders: vi.fn().mockResolvedValue(providers),
    listByWorkspace: vi.fn().mockResolvedValue(connections),
    startGitHubInstall: vi.fn().mockResolvedValue({
      installUrl: 'https://github.com/apps/scylla/installations/new?state=s-1',
      expiresAt: '',
    }),
    deleteById: vi.fn().mockResolvedValue(undefined),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/settings/integrations', search });
  navigate = navigator.navigate;
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({ integrations: { vcsConnectionRepository: repository } }),
  ];
  render(IntegrationsPage);
};

const VIEWER = [Permission.VIEW_INTEGRATIONS];
const ADMIN = [Permission.VIEW_INTEGRATIONS, Permission.MANAGE_VCS_CONNECTIONS];

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  // Unmounted first: a tooltip still reads the ResizeObserver stub of the setup.
  cleanup();
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
  vi.unstubAllGlobals();
});

describe('Integrations page', () => {
  it('shows the providers, the later ones disabled, and the empty state with no connection', async () => {
    setUp(ADMIN);

    expect(await screen.findByText('No Git provider connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect GitHub' })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(screen.getByRole('button', { name: 'Connect GitLab' })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(screen.getByText('GitHub Enterprise Server')).toBeInTheDocument();
    expect(screen.getByText('GitLab self-managed')).toBeInTheDocument();
    expect(screen.getAllByText('Later')).toHaveLength(2);
    for (const button of screen.getAllByRole('button', { name: 'Not available yet' })) {
      expect(button).toBeDisabled();
    }
  });

  it('keeps the connect buttons inert for a reader who cannot manage the connections', async () => {
    setUp(VIEWER, { connections: [connection()] });
    const user = userEvent.setup();

    await screen.findByText('acme');
    const add = screen.getByRole('button', { name: 'Add an account' });
    expect(add).toHaveAttribute('aria-disabled', 'true');
    await user.click(add);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for acme' }));
    expect(await findFloating('menuitem', 'Configure on GitHub')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Disconnect' })).not.toBeInTheDocument();
  });

  it('says why a provider cannot be connected on this server', async () => {
    setUp(ADMIN, {
      providers: [
        { ...PROVIDERS[0], available: false, unavailableReason: 'APP_MISSING' },
        PROVIDERS[1],
      ],
    });

    const button = await screen.findByRole('button', { name: 'Connect GitHub' });
    await waitFor(() => expect(button).toHaveAttribute('aria-disabled', 'true'));
    expect(button).toHaveAccessibleDescription(
      'This server has no GitHub App. An admin of the instance must create it.',
    );
  });

  it('shows the account, the repositories, the event mode and the state of each connection', async () => {
    setUp(ADMIN, {
      connections: [
        connection(),
        connection({
          id: 'c-2',
          provider: 'gitlab',
          account: 'scylla-bot',
          accountKind: 'service_account',
          repositoryCount: 8,
          deliveryMode: 'polling',
          tokenExpiresAt: '2099-11-01T00:00:00.000Z',
        }),
        connection({
          id: 'c-3',
          account: 'lea-martin',
          accountKind: 'user',
          allRepositories: true,
          state: 'suspended',
          stateReason: 'APP_SUSPENDED',
        }),
      ],
    });

    const row = async (account: string) =>
      (await screen.findByText(account)).closest('[data-part="data-table-row"]') as HTMLElement;

    const acme = await row('acme');
    expect(within(acme).getByText('Organization · connected 2 min. ago')).toBeInTheDocument();
    expect(within(acme).getByText('12 repositories')).toBeInTheDocument();
    expect(within(acme).getByText('Webhooks')).toBeInTheDocument();
    expect(within(acme).getByText('Active')).toBeInTheDocument();

    const bot = await row('scylla-bot');
    expect(within(bot).getByText('8 projects')).toBeInTheDocument();
    expect(within(bot).getByText('Polling every 2 min')).toBeInTheDocument();
    expect(within(bot).getByText(/^The token expires on /)).toBeInTheDocument();

    const lea = await row('lea-martin');
    expect(within(lea).getByText('All repositories')).toBeInTheDocument();
    expect(within(lea).getByText('Suspended')).toBeInTheDocument();
    expect(
      within(lea).getByText('An owner suspended the Scylla App on lea-martin.'),
    ).toBeInTheDocument();
  });

  it('shows the uninstalled App in a banner and on its row, with a way to install it again', async () => {
    setUp(ADMIN, {
      connections: [
        connection({ state: 'disconnected', stateReason: 'APP_UNINSTALLED', projectCount: 4 }),
      ],
    });

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(
      'The GitHub App was uninstalled from acme. Reports, triggers and checkouts stopped.',
    );
    expect(banner).toHaveTextContent('Reports, triggers and checkouts stopped for 4 projects.');
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Install again' })).toHaveLength(2);

    await userEvent.setup().click(within(banner).getByRole('button', { name: 'Install again' }));
    expect(await screen.findByRole('dialog', { name: 'Connect GitHub' })).toBeInTheDocument();
  });

  it('lists the permissions of the App, then sends the browser to GitHub to install it', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    setUp(ADMIN);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Connect GitHub' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect GitHub' });
    expect(
      within(dialog).getByText('Read your code, for the checkout and the pipeline files'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Write checks and commit statuses')).toBeInTheDocument();
    expect(within(dialog).getByText('Read pull requests')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Manage branch rules, only for "Block the merge"'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Administration: write')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Install on GitHub' }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://github.com/apps/scylla/installations/new?state=s-1',
      ),
    );
    expect(repository.startGitHubInstall).toHaveBeenCalledWith('ws-1');
  });

  it('asks before a disconnect, with the projects that stop, then deletes the connection', async () => {
    setUp(ADMIN, { connections: [connection()] });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Actions for acme' }));
    await user.click(await findFloating('menuitem', 'Disconnect'));

    const confirm = await screen.findByRole('alertdialog', { name: 'Disconnect acme?' });
    expect(confirm).toHaveTextContent(
      '4 projects use this connection. Reports, triggers and checkouts stop for them.',
    );
    expect(confirm).toHaveTextContent('The App stays installed on GitHub: uninstall it there.');

    await user.click(within(confirm).getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(repository.deleteById).toHaveBeenCalledWith('c-1'));
  });

  it('shows the next step after a new connection, until the user dismisses it', async () => {
    setUp(ADMIN, { connections: [connection()], search: '?connected=c-1' });
    const user = userEvent.setup();

    const title = await screen.findByText('Connected to acme (12 repositories)');
    const card = title.closest('[role="status"]') as HTMLElement;
    expect(card).toHaveTextContent(
      'Next: link a repository to a project, in Project › Settings › Repository.',
    );

    await user.click(within(card).getByRole('button', { name: 'Dismiss' }));
    expect(navigate).toHaveBeenCalledWith('/acme/settings/integrations', { replace: true });
  });
});
