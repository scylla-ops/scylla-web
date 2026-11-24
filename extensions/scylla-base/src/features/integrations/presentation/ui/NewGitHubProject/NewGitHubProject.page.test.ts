import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  ProviderRepository,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import NewGitHubProjectPage from './NewGitHubProject.page.svelte';

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
  repositoryCount: 2,
  projectCount: 0,
  scopes: [],
  missingPermissions: [],
  settingsUrl: 'https://github.com/organizations/acme/settings/installations/1',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

const repository = (patch: Partial<ProviderRepository> = {}): ProviderRepository => ({
  externalId: '7',
  fullName: 'acme/api',
  webUrl: 'https://github.com/acme/api',
  defaultBranch: 'main',
  private: true,
  role: '',
  ...patch,
});

const ALL = [
  Permission.CREATE_PROJECT,
  Permission.MANAGE_REPOSITORY_LINK,
  Permission.MANAGE_VCS_CONNECTIONS,
];

let teardown: Array<() => void> = [];
let connections: Record<string, ReturnType<typeof vi.fn>>;
let links: Record<string, ReturnType<typeof vi.fn>>;
let sources: Record<string, ReturnType<typeof vi.fn>>;
let projects: Record<string, ReturnType<typeof vi.fn>>;

const open = ({
  permissions = ALL,
  workspaceConnections = [connection()],
  repositories = [repository(), repository({ externalId: '8', fullName: 'acme/web' })],
  search = '',
}: {
  permissions?: Permission[];
  workspaceConnections?: VcsConnectionEntity[];
  repositories?: ProviderRepository[];
  search?: string;
} = {}) => {
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
  connections = {
    getProviders: vi.fn().mockResolvedValue([
      { provider: 'github', available: true, unavailableReason: '' },
      { provider: 'gitlab', available: true, unavailableReason: '' },
    ]),
    listByWorkspace: vi.fn().mockResolvedValue(workspaceConnections),
    listRepositories: vi.fn().mockResolvedValue({ repositories, nextPageToken: '' }),
  };
  links = {
    link: vi.fn().mockResolvedValue({ projectId: 'p-1', fullName: 'acme/api' }),
    update: vi.fn().mockResolvedValue({ projectId: 'p-1' }),
  };
  sources = { setSource: vi.fn().mockResolvedValue(undefined) };
  projects = {
    create: vi.fn().mockResolvedValue({ id: 'p-1', workspaceId: 'ws-1', name: 'api' }),
    getByWorkspaceId: vi.fn().mockResolvedValue({ items: [] }),
  };
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/projects/new/github', search });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      integrations: {
        vcsConnectionRepository: connections,
        repositoryLinkRepository: links,
        pipelineSourceRepository: sources,
      },
      project: { projectRepository: projects },
    }),
  ];
  render(NewGitHubProjectPage);
  return navigator;
};

const pick = async (name: string) => {
  await userEvent.click(await screen.findByRole('radio', { name }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('NewGitHubProjectPage', () => {
  it('lists the repositories of the GitHub connection for the workspace, before the project exists', async () => {
    open({
      workspaceConnections: [connection({ id: 'c-0', provider: 'gitlab' }), connection()],
    });

    expect(await screen.findByRole('radio', { name: 'acme/api' })).toBeInTheDocument();
    expect(screen.getByText('New project · Linked to GitHub · Step 1 of 2')).toBeInTheDocument();
    expect(connections.listRepositories).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      connectionId: 'c-1',
      search: '',
    });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('shows first the connection that the GitHub callback made', async () => {
    open({
      workspaceConnections: [connection(), connection({ id: 'c-2', account: 'labs' })],
      search: '?connection=c-2',
    });

    await screen.findByRole('radio', { name: 'acme/api' });
    expect(connections.listRepositories).toHaveBeenCalledWith(
      expect.objectContaining({ connectionId: 'c-2' }),
    );
  });

  it('names the project after the repository, then creates it, links it, and opens it', async () => {
    const { navigate } = open();

    await pick('acme/api');

    expect(screen.getByText('New project · Linked to GitHub · Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Project name')).toHaveValue('api');
    expect(screen.getByRole('switch', { name: /Report results to GitHub/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/acme/projects/p-1', undefined),
    );
    expect(projects.create).toHaveBeenCalledWith('api', 'ws-1', undefined);
    expect(links.link).toHaveBeenCalledWith({
      projectId: 'p-1',
      connectionId: 'c-1',
      externalId: '7',
    });
    expect(sources.setSource).not.toHaveBeenCalled();
    expect(links.update).not.toHaveBeenCalled();
  });

  it('sets the files as the source and turns the reports off only when the person asks', async () => {
    const { navigate } = open();

    await pick('acme/api');
    await userEvent.click(screen.getByRole('radio', { name: /Repository files/ }));
    await userEvent.click(screen.getByRole('switch', { name: /Report results to GitHub/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects/p-1', undefined));
    expect(sources.setSource).toHaveBeenCalledWith({ projectId: 'p-1', source: 'file' });
    expect(links.update).toHaveBeenCalledWith({ projectId: 'p-1', reportsEnabled: false });
  });

  it('keeps a name that the person typed when the repository changes', async () => {
    open();

    await pick('acme/api');
    const name = screen.getByLabelText('Project name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Payments');
    await userEvent.click(screen.getByRole('button', { name: 'Change acme/api' }));
    await pick('acme/web');

    expect(screen.getByLabelText('Project name')).toHaveValue('Payments');
  });

  it('keeps the project when the link fails, and a retry links it with no second project', async () => {
    const { navigate } = open();
    links.link.mockRejectedValueOnce(
      new ScyllaError('taken', {
        code: 'FAILED_PRECONDITION',
        reason: 'REPOSITORY_ALREADY_LINKED',
        raw: true,
      }),
    );

    await pick('acme/api');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The project is created, but its setup is not complete.');
    expect(alert).toHaveTextContent('This project already has a repository. Unlink it first.');
    expect(screen.getByRole('link', { name: 'Open the project settings' })).toHaveAttribute(
      'href',
      '/acme/projects/p-1/settings/repository',
    );
    expect(screen.getByLabelText('Project name')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects/p-1', undefined));
    expect(projects.create).toHaveBeenCalledTimes(1);
    expect(links.link).toHaveBeenCalledTimes(2);
  });

  it('asks to connect GitHub when the workspace has no GitHub connection', async () => {
    open({ workspaceConnections: [connection({ provider: 'gitlab' })] });

    expect(await screen.findByText('GitHub is not connected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }));

    expect(await screen.findByRole('dialog', { name: 'Connect GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('keeps Connect GitHub inert for a person who cannot manage the connections', async () => {
    open({
      permissions: [Permission.CREATE_PROJECT, Permission.MANAGE_REPOSITORY_LINK],
      workspaceConnections: [],
    });

    const connect = await screen.findByRole('button', { name: 'Connect GitHub' });
    expect(connect).toHaveAttribute('aria-disabled', 'true');
    expect(connect).toHaveAccessibleDescription(
      'Only the admins of the workspace can connect a Git provider.',
    );
  });

  it('tells how to add a repository on GitHub when none matches', async () => {
    open({ repositories: [] });

    expect(await screen.findByText('The connection cannot see a repository.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Configure on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/acme/settings/installations/1',
    );
  });
});
