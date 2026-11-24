import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type {
  FragmentEntity,
  FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import FragmentDetailPage from './FragmentDetail.page.svelte';

const REM = { id: 'rem', name: 'Rem' };
const PACKAGE = { packageId: 'pnpm.node-ci', publisher: 'pnpm', name: 'node-ci', verified: true };

const version = (number: number, nodeVersion: string, ...nodes: string[]): FragmentVersion => ({
  number,
  nodes: ['install', ...nodes].map(id => ({
    id,
    deps: [],
    kind: 'exec' as const,
    command: 'pnpm',
    args: [id],
    env: [],
  })),
  parameters: [
    { key: 'NODE_VERSION', kind: 'literal', default: nodeVersion, description: 'Node.js.' },
  ],
  changes: [],
  author: { id: 'pnpm', name: 'pnpm' },
  publishedAt: '2026-10-01T10:00:00Z',
});

const usage = (pipelineName: string, values: Record<string, string> = {}) => ({
  pipelineId: pipelineName,
  pipelineName,
  projectId: 'store',
  projectName: 'store',
  version: 8,
  values,
});

const own: FragmentEntity = {
  id: 'f1',
  workspaceId: 'ws-1',
  name: 'rust-ci',
  description: 'Lint and tests.',
  tags: ['rust'],
  author: REM,
  versions: [{ ...version(1, '20'), author: REM }],
  favorite: false,
  usages: [],
};

const linked: FragmentEntity = {
  ...own,
  id: 'f2',
  name: 'node-ci',
  versions: [version(8, '20')],
  usages: [usage('api'), usage('legacy-web', { NODE_VERSION: '18' })],
  source: {
    kind: 'linked',
    package: PACKAGE,
    addedAt: '2026-10-01T10:00:00Z',
    upstream: [version(9, '22', 'audit')],
    skipped: [],
  },
};

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

let teardown: Array<() => void> = [];

const renderPage = (fragment: FragmentEntity) => {
  const cache = withQueryClient();
  const fragmentRepository = {
    getById: vi.fn().mockResolvedValue(fragment),
    acceptUpstream: vi.fn().mockResolvedValue(fragment),
    publishToMarketplace: vi.fn().mockResolvedValue(fragment),
  };
  teardown = [
    cache.restore,
    withRegistry({
      pipeline: { fragmentRepository },
      user: {
        userRepository: {
          getMe: () => Promise.resolve({ id: 'rem', username: 'rem', displayName: 'Rem' }),
        },
      },
    }),
  ];
  render(FragmentDetailPage, { fragmentId: fragment.id });
  return fragmentRepository;
};

beforeEach(() => {
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  grant([Permission.UPDATE_WORKSPACE]);
});

afterEach(() => teardown.forEach(restore => restore()));

describe('FragmentDetailPage', () => {
  it('shows an admin what the upstream version changes, and accepts it', async () => {
    const repository = renderPage(linked);

    const card = (await screen.findByText('v9 is available from @pnpm')).closest(
      'div',
    )!.parentElement!;
    expect(within(card).getByText('New node: audit')).toBeInTheDocument();
    expect(within(card).getByText('NODE_VERSION default 20 → 22')).toBeInTheDocument();
    expect(within(card).getByText('1 of 2 pipelines can switch as is.')).toBeInTheDocument();
    expect(
      within(card).getByText(/pins NODE_VERSION=18 and keeps it: legacy-web/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Accept v9 in the library' }));
    expect(repository.acceptUpstream).toHaveBeenCalledWith('f2', 9);
  });

  it('leaves the upstream decision to the admins', async () => {
    grant([]);
    renderPage(linked);

    expect(
      await screen.findByText(
        'Only the admins of the workspace accept or skip an upstream version.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept v9/ })).not.toBeInTheDocument();
  });

  it('publishes a fragment of the workspace under its scope', async () => {
    const repository = renderPage(own);

    await userEvent.click(await screen.findByRole('button', { name: 'Publish to marketplace' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue('@acme/rust-ci')).toBeInTheDocument();
    expect(within(dialog).getByText('4 of 4 passed')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Publish v1' }));
    expect(repository.publishToMarketplace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', version: 1, author: REM }),
    );
  });
});
