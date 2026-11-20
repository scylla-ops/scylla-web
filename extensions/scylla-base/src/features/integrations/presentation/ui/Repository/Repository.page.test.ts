import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { MergeBlock } from '@base/features/integrations/domain/entities/merge-block.entity.ts';
import type { PipelineFiles } from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';
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
let sources: Record<string, ReturnType<typeof vi.fn>>;

const nightly = (line: number, message: string, warning = false) => ({
  path: '.scylla/pipelines/nightly.yml',
  line,
  column: 1,
  message,
  warning,
});

const FILES: PipelineFiles = {
  commitSha: 'a1b2c3d4e5f6',
  files: [
    {
      key: 'build',
      path: '.scylla/pipelines/build.toml',
      url: '',
      issues: [],
      triggers: ['push', 'pull_request'],
    },
    { key: 'deploy', path: '.scylla/pipelines/deploy.toml', url: '', issues: [], triggers: [] },
    {
      key: 'nightly',
      path: '.scylla/pipelines/nightly.yml',
      url: '',
      // A warning does not count: three errors.
      issues: [
        nightly(12, 'expected "="'),
        nightly(14, 'bad'),
        nightly(20, 'bad'),
        nightly(3, 'unknown secret', true),
      ],
      triggers: [],
    },
  ],
  issues: [],
};

const setUp = (
  permissions: Permission[],
  {
    current = null as RepositoryLink | null,
    rules = [] as MergeBlock[],
    workspaceConnections = [] as VcsConnectionEntity[],
    files = FILES,
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
  blocks = {
    listByProject: vi.fn().mockResolvedValue(rules),
    set: vi.fn().mockImplementation(input =>
      Promise.resolve(block({ ...input, state: input.enabled ? 'on' : 'off' })),
    ),
  };
  sources = {
    listFiles: vi.fn().mockResolvedValue(files),
    setSource: vi.fn().mockResolvedValue(undefined),
  };
  connections = { listByWorkspace: vi.fn().mockResolvedValue(workspaceConnections) };
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      integrations: {
        repositoryLinkRepository: links,
        mergeBlockRepository: blocks,
        vcsConnectionRepository: connections,
        pipelineSourceRepository: sources,
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
    expect(
      screen.getByText(
        'One job per Scylla pipeline in the stage external of the GitLab pipeline of the commit.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Enable again' }));

    expect(await screen.findByRole('status')).toHaveTextContent('The test webhook arrived.');
  });

  it('reports to GitHub with check runs only, and turns the reports off', async () => {
    setUp(EDITOR, { current: link() });
    const user = userEvent.setup();

    expect(
      await screen.findByText(
        'One check run per Scylla pipeline in the Checks tab of the commit: the nodes, the durations, the last log lines, Re-run.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Check run|Commit status/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Report results to GitHub' }));
    await waitFor(() =>
      expect(links.update).toHaveBeenCalledWith({ projectId: 'p-1', reportsEnabled: false }),
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

  describe('pipeline source', () => {
    it('lists the files of the default branch of a project on files, with the state of each', async () => {
      setUp(READER, { current: link({ pipelineSource: 'file' }) });

      expect(await screen.findByText('Found on main at a1b2c3d')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Repository files' })).toBeChecked();
      const files = screen.getByRole('list', { name: 'Repository files' });
      const rows = within(files).getAllByRole('listitem');
      expect(rows[0]).toHaveTextContent('.scylla/pipelines/build.toml');
      expect(rows[0]).toHaveTextContent('Valid');
      expect(rows[0]).toHaveTextContent('on: push, pull_request');
      expect(rows[1]).toHaveTextContent('no on section: manual runs only');
      expect(rows[2]).toHaveTextContent('3 errors');
      expect(rows[2]).toHaveTextContent('line 12: expected "="');
      expect(sources.listFiles).toHaveBeenCalledWith('p-1');
    });

    it('does not read the files of a project on the editor, and keeps the choice inert for a reader', async () => {
      setUp(READER, { current: link() });

      const editor = await screen.findByRole('radio', { name: 'Scylla editor' });
      expect(editor).toBeChecked();
      expect(editor).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Repository files' })).toBeDisabled();
      expect(sources.listFiles).not.toHaveBeenCalled();
    });

    it('shows the files and their errors before a move to the files, then moves', async () => {
      setUp(EDITOR, { current: link() });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('radio', { name: 'Repository files' }));
      const dialog = await screen.findByRole('alertdialog', { name: 'Use the repository files?' });
      expect(await within(dialog).findByText('Found on main at a1b2c3d')).toBeInTheDocument();
      expect(within(dialog).getByText(/runs fail with "Invalid pipeline file"/)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Scylla editor' })).toBeChecked();

      links.getByProject.mockResolvedValue(link({ pipelineSource: 'file' }));
      await user.click(within(dialog).getByRole('button', { name: 'Use the files' }));

      expect(sources.setSource).toHaveBeenCalledWith({ projectId: 'p-1', source: 'file' });
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await waitFor(() =>
        expect(screen.getByRole('radio', { name: 'Repository files' })).toBeChecked(),
      );
    });

    it('keeps the source when the person cancels the move', async () => {
      setUp(EDITOR, { current: link({ pipelineSource: 'file' }) });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('radio', { name: 'Scylla editor' }));
      const dialog = await screen.findByRole('alertdialog', {
        name: 'Go back to the Scylla editor?',
      });
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(screen.getByRole('radio', { name: 'Repository files' })).toBeChecked();
      expect(sources.setSource).not.toHaveBeenCalled();
    });

    it('shows a refusal of the move in the dialog', async () => {
      setUp(EDITOR, { current: link({ pipelineSource: 'file' }) });
      sources.setSource.mockRejectedValue(
        new ScyllaError('GitHub did not answer', { code: 'FAILED_PRECONDITION' }),
      );
      const user = userEvent.setup();

      await user.click(await screen.findByRole('radio', { name: 'Scylla editor' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Use the editor' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('GitHub did not answer');
      expect(sources.setSource).toHaveBeenCalledWith({ projectId: 'p-1', source: 'editor' });
    });
  });

  describe('block the merge', () => {
    it('turns on the rule of a pipeline on GitHub', async () => {
      setUp(EDITOR, { current: link(), rules: [block()] });
      const user = userEvent.setup();

      const rule = await screen.findByRole('switch', {
        name: 'Block the merge into main when scylla/build fails',
      });
      expect(rule).not.toBeChecked();
      expect(
        screen.getByText('A failure of scylla/build does not block the merge.'),
      ).toBeInTheDocument();
      blocks.listByProject.mockResolvedValue([
        block({ enabled: true, state: 'on', actionUrl: 'https://github.com/acme/api/rules/7' }),
      ]);

      await user.click(rule);

      expect(blocks.set).toHaveBeenCalledWith({
        projectId: 'p-1',
        pipelineId: 'pl-1',
        enabled: true,
      });
      expect(await screen.findByText('Required on main')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /scylla\/build fails/ })).toBeChecked();
      expect(await screen.findByRole('link', { name: /View on GitHub/ })).toHaveAttribute(
        'href',
        'https://github.com/acme/api/rules/7',
      );
    });

    it('shows the change as applying until the server answers', async () => {
      setUp(EDITOR, { current: link(), rules: [block()] });
      blocks.set.mockReturnValue(new Promise(() => undefined));
      const user = userEvent.setup();

      await user.click(await screen.findByRole('switch', { name: /scylla\/build fails/ }));

      expect(await screen.findByText('Updating GitHub…')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /scylla\/build fails/ })).toBeChecked();
      expect(screen.getByRole('switch', { name: /scylla\/build fails/ })).toBeDisabled();
    });

    it('gives the grant page and the steps by hand when the permission is missing', async () => {
      setUp(EDITOR, {
        current: link(),
        rules: [
          block({
            enabled: true,
            state: 'needs_permission',
            stateReason: 'ADMINISTRATION_PERMISSION_MISSING',
            actionUrl: 'https://github.com/organizations/acme/settings/installations/1',
          }),
        ],
      });
      const user = userEvent.setup();

      expect(await screen.findByText('Permission needed')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The installation on acme did not accept the new permission Administration: write.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /scylla\/build fails/ })).not.toBeChecked();
      expect(screen.getByRole('link', { name: /Grant the permission on GitHub/ })).toHaveAttribute(
        'href',
        'https://github.com/organizations/acme/settings/installations/1',
      );

      const byHand = screen.getByRole('button', { name: 'Do it by hand' });
      expect(byHand).toHaveAttribute('aria-expanded', 'false');
      await user.click(byHand);

      expect(byHand).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByText(
          'On GitHub, open acme/api › Settings › Rules › Rulesets › New branch ruleset.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Target the default branch (main), enforcement Active.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy scylla/build' })).toBeInTheDocument();
    });

    it('applies again a rule that someone changed on GitHub', async () => {
      setUp(EDITOR, {
        current: link(),
        rules: [block({ enabled: true, state: 'out_of_sync' })],
      });
      const user = userEvent.setup();

      expect(await screen.findByText('Out of sync')).toBeInTheDocument();
      expect(screen.getByText('Someone changed the rule on GitHub.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Apply again' }));

      expect(blocks.set).toHaveBeenCalledWith({
        projectId: 'p-1',
        pipelineId: 'pl-1',
        enabled: true,
      });
    });

    it('says that GitHub Free has no rule on a private repository', async () => {
      setUp(EDITOR, {
        current: link(),
        rules: [
          block({
            enabled: true,
            state: 'not_possible',
            stateReason: 'PRIVATE_REPOSITORY_NOT_ALLOWED',
          }),
        ],
      });

      expect(await screen.findByText('Not available')).toBeInTheDocument();
      expect(
        screen.getByText('GitHub Free does not allow rules on private repositories.'),
      ).toBeInTheDocument();
    });

    it('has one rule for the project on GitLab', async () => {
      setUp(EDITOR, {
        current: link({
          provider: 'gitlab',
          fullName: 'bank/payments',
          webUrl: 'https://gitlab.com/bank/payments',
        }),
        rules: [block({ pipelineId: undefined, context: '' })],
      });
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole('switch', { name: 'Block the merge when a Scylla pipeline fails' }),
      );

      expect(blocks.set).toHaveBeenCalledWith({ projectId: 'p-1', enabled: true });
    });

    it('keeps the rules inert for a reader', async () => {
      setUp(READER, {
        current: link(),
        rules: [block({ enabled: true, state: 'out_of_sync' })],
      });

      expect(await screen.findByRole('switch', { name: /scylla\/build fails/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Apply again' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  });
});
