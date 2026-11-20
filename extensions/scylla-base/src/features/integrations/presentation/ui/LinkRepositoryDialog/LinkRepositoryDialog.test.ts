import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type {
  ProviderRepository,
  VcsConnectionEntity,
} from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import LinkRepositoryDialog from './LinkRepositoryDialog.svelte';

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
  repositoryCount: 3,
  projectCount: 1,
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

const REPOSITORIES = [
  repository(),
  repository({ externalId: '8', fullName: 'acme/apidocs', private: false, defaultBranch: 'gh-pages' }),
  repository({ externalId: '9', fullName: 'acme/api-mocks', linkedProjectId: 'p-2' }),
];

let teardown: Array<() => void> = [];
let connections: Record<string, ReturnType<typeof vi.fn>>;
let links: Record<string, ReturnType<typeof vi.fn>>;
const onOpenChange = vi.fn();

const setUp = ({
  workspaceConnections = [connection()],
  repositories = REPOSITORIES,
}: { workspaceConnections?: VcsConnectionEntity[]; repositories?: ProviderRepository[] } = {}) => {
  connections = {
    listByWorkspace: vi.fn().mockResolvedValue(workspaceConnections),
    listRepositories: vi.fn().mockResolvedValue({ repositories, nextPageToken: '' }),
  };
  links = {
    link: vi.fn().mockResolvedValue({ projectId: 'p-1', fullName: 'acme/api' }),
  };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      integrations: { vcsConnectionRepository: connections, repositoryLinkRepository: links },
      project: {
        projectRepository: {
          getByWorkspaceId: vi.fn().mockResolvedValue({ items: [{ id: 'p-2', name: 'Mocks' }] }),
        },
      },
    }),
  ];
  render(LinkRepositoryDialog, {
    open: true,
    onOpenChange,
    projectId: 'p-1',
    workspaceId: 'ws-1',
    workspaceSlug: 'acme',
    canViewIntegrations: true,
  });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  teardown.forEach(restore => restore());
});

describe('Link a repository dialog', () => {
  it('lists the repositories of the first active connection; one of another project cannot be picked', async () => {
    setUp({
      workspaceConnections: [
        connection({ id: 'c-0', provider: 'gitlab', account: 'bot', state: 'needs_attention' }),
        connection(),
      ],
    });

    const api = await screen.findByRole('radio', { name: 'acme/api' });
    expect(api).toHaveAccessibleDescription('Private · default branch main');
    expect(screen.getByRole('combobox', { name: 'Connection' })).toHaveTextContent(
      'acme · github.com',
    );
    expect(connections.listRepositories).toHaveBeenCalledWith({
      projectId: 'p-1',
      connectionId: 'c-1',
      search: '',
    });
    expect(screen.getByRole('radio', { name: 'acme/apidocs' })).toHaveAccessibleDescription(
      'Public · default branch gh-pages',
    );
    const taken = screen.getByRole('radio', { name: 'acme/api-mocks' });
    expect(taken).toBeDisabled();
    await waitFor(() =>
      expect(taken).toHaveAccessibleDescription(
        'Private · default branch main · linked to the project Mocks',
      ),
    );
    expect(screen.getByRole('link', { name: /Configure on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/acme/settings/installations/1',
    );
    expect(screen.getByRole('button', { name: 'Link repository' })).toBeDisabled();
  });

  it('links the chosen repository, then closes', async () => {
    setUp();
    const user = userEvent.setup();

    await user.click(await screen.findByText('acme/api'));
    expect(screen.getByRole('radio', { name: 'acme/api' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Link repository' }));

    await waitFor(() =>
      expect(links.link).toHaveBeenCalledWith({
        projectId: 'p-1',
        connectionId: 'c-1',
        externalId: '7',
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows the refusal of the server under the list, and keeps the dialog open', async () => {
    setUp();
    const user = userEvent.setup();
    links.link.mockRejectedValue(
      new ScyllaError('linked', {
        code: 'FAILED_PRECONDITION',
        raw: true,
        reason: 'REPOSITORY_ALREADY_LINKED',
      }),
    );

    await user.click(await screen.findByText('acme/apidocs'));
    await user.click(screen.getByRole('button', { name: 'Link repository' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This project already has a repository. Unlink it first.',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('searches on the provider after a pause in the typing', async () => {
    setUp();
    const user = userEvent.setup();
    await screen.findByRole('radio', { name: 'acme/api' });
    await focusSettled();

    await user.type(screen.getByRole('textbox', { name: 'Find a repository' }), 'docs');

    await waitFor(() =>
      expect(connections.listRepositories).toHaveBeenCalledWith({
        projectId: 'p-1',
        connectionId: 'c-1',
        search: 'docs',
      }),
    );
    expect(connections.listRepositories).toHaveBeenCalledTimes(2);
  });

  it('says that no provider is connected, and points to Integrations', async () => {
    setUp({ workspaceConnections: [] });

    expect(
      await screen.findByText(
        'No Git provider is connected to this workspace. An admin of the workspace connects GitHub or GitLab in Integrations.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Integrations' })).toHaveAttribute(
      'href',
      '/acme/settings/integrations',
    );
    expect(connections.listRepositories).not.toHaveBeenCalled();
  });
});
