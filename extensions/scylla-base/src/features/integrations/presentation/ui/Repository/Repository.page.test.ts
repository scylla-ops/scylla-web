import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { RepositoryLink } from '@base/features/integrations/domain/entities/repository-link.entity.ts';
import type { VcsConnectionEntity } from '@base/features/integrations/domain/entities/vcs-connection.entity.ts';
import RepositoryPage from './Repository.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const link = (patch: Partial<RepositoryLink> = {}): RepositoryLink => ({
  projectId: 'p-1',
  workspaceId: 'ws-1',
  connectionId: 'c-1',
  provider: 'github',
  account: 'acme',
  externalId: '7',
  fullName: 'acme/api',
  webUrl: 'https://github.com/acme/api',
  defaultBranch: 'main',
  private: true,
  pipelineSource: 'editor',
  reportsEnabled: true,
  reportMode: 'check_run',
  deliveryMode: 'webhook',
  pollIntervalSeconds: 120,
  lastEventAt: new Date(Date.now() - 180_000).toISOString(),
  state: 'active',
  stateReason: '',
  createdBy: 'u-1',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...patch,
});

const block = (patch: Partial<MergeBlock> = {}): MergeBlock => ({
  projectId: 'p-1',
  pipelineId: 'pl-1',
  context: 'scylla/build',
  enabled: false,
  state: 'off',
  stateReason: '',
  branch: 'main',
  actionUrl: '',
  updatedAt: '',
  ...patch,
});

const READER = [Permission.READ_REPOSITORY_LINK];
const EDITOR = [Permission.READ_REPOSITORY_LINK, Permission.MANAGE_REPOSITORY_LINK];

let teardown: Array<() => void> = [];
let links: Record<string, ReturnType<typeof vi.fn>>;
let blocks: Record<string, ReturnType<typeof vi.fn>>;
let connections: Record<string, ReturnType<typeof vi.fn>>;

const setUp = (
  permissions: Permission[],
  {
    current = null as RepositoryLink | null,
    rules = [] as MergeBlock[],
    workspaceConnections = [] as VcsConnectionEntity[],
  } = {},
) => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions: [Permission.VIEW_INTEGRATIONS] },
        },
        { scope: PermissionScope.PROJECT, scopeId: 'p-1', access: { kind: 'restricted', permissions } },
      ],
    },
  });
  contextStore.setState({
    workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' },
    project: { id: 'p-1', name: 'API' },
  });
  links = {
    getByProject: vi.fn().mockResolvedValue(current),
    update: vi.fn().mockImplementation(input => Promise.resolve(link({ ...current, ...input }))),
    unlink: vi.fn().mockResolvedValue(undefined),
    testDelivery: vi.fn(),
  };
  blocks = { listByProject: vi.fn().mockResolvedValue(rules) };
  connections = { listByWorkspace: vi.fn().mockResolvedValue(workspaceConnections) };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      integrations: {
        repositoryLinkRepository: links,
        mergeBlockRepository: blocks,
        vcsConnectionRepository: connections,
      },
    }),
  ];
  render(RepositoryPage, { projectId: 'p-1' });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('Repository page', () => {
  it('shows the empty state, and only an editor of the project can open the picker', async () => {
    setUp(READER);

    expect(await screen.findByRole('heading', { name: 'No repository linked' })).toBeInTheDocument();
    expect(screen.getByText('Settings of the project API.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Link a repository' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the picker for an editor', async () => {
    setUp(EDITOR);

    await userEvent.click(await screen.findByRole('button', { name: 'Link a repository' }));

    expect(await screen.findByRole('dialog', { name: 'Link a repository' })).toBeInTheDocument();
  });

  it('shows the repository, its default branch, its events and the names of its reports', async () => {
    setUp(EDITOR, {
      current: link(),
      rules: [block(), block({ pipelineId: 'pl-2', context: 'scylla/deploy' })],
    });

    expect(await screen.findByRole('link', { name: /acme\/api/ })).toHaveAttribute(
      'href',
      'https://github.com/acme/api',
    );
    expect(screen.getByText('Private · connection acme · github.com')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Webhooks · last event 3 min. ago')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Report results to GitHub' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Check run/ })).toBeChecked();
    expect(await screen.findByText('scylla/build')).toBeInTheDocument();
    expect(screen.getByText('scylla/deploy')).toBeInTheDocument();
    expect(blocks.listByProject).toHaveBeenCalledWith('p-1');
  });

  it('says that the server cannot test the webhook yet, with no error toast', async () => {
    setUp(EDITOR, { current: link() });
    links.testDelivery.mockRejectedValue(
      new ScyllaError('TestDelivery is not served', { code: 'UNIMPLEMENTED' }),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Test webhook' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'This server cannot test the webhook yet.',
    );
    expect(links.testDelivery).toHaveBeenCalledWith('p-1');
  });

  it('shows the result of a test webhook', async () => {
    setUp(EDITOR, { current: link() });
    links.testDelivery.mockResolvedValue({ delivered: false, error: 'no answer in 10 s', link: link() });

    await userEvent.click(await screen.findByRole('button', { name: 'Test webhook' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'The test webhook did not arrive: no answer in 10 s',
    );
  });

  it('polls when GitLab disabled the webhook, and offers to enable it again', async () => {
    setUp(EDITOR, {
      current: link({
        provider: 'gitlab',
        fullName: 'bank/payments',
        webUrl: 'https://gitlab.com/bank/payments',
        reportMode: 'commit_status',
        deliveryMode: 'polling',
        lastEventAt: undefined,
        stateReason: 'WEBHOOK_DISABLED',
      }),
      rules: [block({ pipelineId: undefined, context: '' })],
    });
    links.testDelivery.mockResolvedValue({ delivered: true, error: '', link: link() });

    expect(
      await screen.findByText('Polling every 2 min · GitLab disabled the webhook after failures.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'One job per Scylla pipeline in the stage external of the GitLab pipeline of the commit.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Enable again' }));

    expect(await screen.findByRole('status')).toHaveTextContent('The test webhook arrived.');
  });

  it('turns the reports off and changes the report mode', async () => {
    setUp(EDITOR, { current: link() });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('switch', { name: 'Report results to GitHub' }));
    await waitFor(() =>
      expect(links.update).toHaveBeenCalledWith({ projectId: 'p-1', reportsEnabled: false }),
    );

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Report results to GitHub' })).toBeChecked(),
    );
    await user.click(screen.getByRole('radio', { name: /Commit status/ }));
    await waitFor(() =>
      expect(links.update).toHaveBeenCalledWith({ projectId: 'p-1', reportMode: 'commit_status' }),
    );
  });

  it('keeps the reports and the test webhook inert for a reader', async () => {
    setUp(READER, { current: link() });

    expect(await screen.findByRole('switch', { name: 'Report results to GitHub' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Test webhook' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Unlink repository' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('lists what stops, then unlinks the repository', async () => {
    setUp(EDITOR, { current: link(), rules: [block({ enabled: true, state: 'on' })] });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Unlink repository' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Unlink acme/api?' });
    await waitFor(() =>
      expect(within(dialog).getByText('The rules that block the merge: scylla/build.')).toBeInTheDocument(),
    );
    expect(within(dialog).getByText('The reports to GitHub.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('The push, pull request and tag triggers of the pipelines.'),
    ).toBeInTheDocument();

    links.getByProject.mockResolvedValue(null);
    await user.click(within(dialog).getByRole('button', { name: 'Unlink repository' }));

    expect(links.unlink).toHaveBeenCalledWith('p-1');
    expect(await screen.findByRole('heading', { name: 'No repository linked' })).toBeInTheDocument();
  });

  it('sends a repository that GitHub hides to the installation of the connection', async () => {
    setUp(EDITOR, {
      current: link({ state: 'needs_attention', stateReason: 'REPOSITORY_NOT_VISIBLE' }),
      workspaceConnections: [
        {
          id: 'c-1',
          settingsUrl: 'https://github.com/organizations/acme/settings/installations/1',
        } as VcsConnectionEntity,
      ],
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Scylla cannot see acme/api. Add it to the installation on GitHub.',
    );
    expect(await within(alert).findByRole('link', { name: /Configure on GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/acme/settings/installations/1',
    );
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Test webhook' })).not.toBeInTheDocument();
  });
});
