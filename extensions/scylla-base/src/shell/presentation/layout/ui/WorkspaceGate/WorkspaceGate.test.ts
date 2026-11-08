import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import WorkspaceGateFixture from './WorkspaceGate.fixture.svelte';

const syncMyPermissions = vi.fn();

vi.mock('@base/features/access', () => ({
  syncMyPermissions: (workspaceId: string | null, projectId: string | null) =>
    syncMyPermissions(workspaceId, projectId),
}));
vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let create: ReturnType<typeof vi.fn>;

const setUp = (getMine: () => Promise<{ id: string; name: string; slug: string }[]>) => {
  create = vi.fn((name: string) => Promise.resolve({ id: 'org-9', name, slug: 'my-org' }));
  const cache = withQueryClient();
  const getMe = vi
    .fn()
    .mockResolvedValue({ id: 'user-1', username: 'ada', isActive: true, updatedAt: '' });
  teardown = [
    cache.restore,
    withRegistry({
      workspace: { workspaceRepository: { getMine, create } },
      user: { userRepository: { getMe } },
    }),
  ];
  return render(WorkspaceGateFixture);
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  navigator = installTestNavigator();
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'web' },
  });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
  permissionsStore.setState({ permissions: null });
});

const holding = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

describe('WorkspaceGate', () => {
  it('shows neither the page nor the welcome screen while the workspaces load', () => {
    setUp(() => new Promise(() => {}));

    expect(screen.queryByText('page content')).not.toBeInTheDocument();
    expect(screen.queryByText('Welcome to Scylla!')).not.toBeInTheDocument();
  });

  it('renders the page when the user has workspaces', async () => {
    setUp(() => Promise.resolve([{ id: 'org-1', name: 'Acme', slug: 'acme' }]));

    expect(await screen.findByText('page content')).toBeInTheDocument();
  });

  it('loads the permissions for the active workspace and project', async () => {
    setUp(() => Promise.resolve([{ id: 'org-1', name: 'Acme', slug: 'acme' }]));
    await screen.findByText('page content');

    expect(syncMyPermissions).toHaveBeenCalledWith('org-1', 'project-1');
  });

  it('loads the permissions again when the active project changes', async () => {
    setUp(() => Promise.resolve([{ id: 'org-1', name: 'Acme', slug: 'acme' }]));
    await screen.findByText('page content');

    contextStore.getState().setProject('project-2', 'api');

    await waitFor(() => expect(syncMyPermissions).toHaveBeenCalledWith('org-1', 'project-2'));
  });

  it('shows the welcome screen when the user has no workspace', async () => {
    setUp(() => Promise.resolve([]));

    expect(await screen.findByText('Welcome to Scylla!')).toBeInTheDocument();
    expect(screen.queryByText('page content')).not.toBeInTheDocument();
  });

  it('creates the first workspace and opens its dashboard', async () => {
    holding([Permission.CREATE_WORKSPACE]);
    setUp(() => Promise.resolve([]));
    await screen.findByText('Welcome to Scylla!');
    await focusSettled();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Workspace name'), 'My Org');
    await user.type(screen.getByLabelText('Address'), 'my-org');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('My Org', 'my-org'));
    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/my-org/dashboard', undefined),
    );
  });

  it('tells a user who may not create a workspace to ask an administrator, with no form', async () => {
    holding([]);
    setUp(() => Promise.resolve([]));

    expect(
      await screen.findByText(
        'You are not a member of a workspace yet. Ask an administrator to add you.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Workspace name')).not.toBeInTheDocument();
  });

  it.each([
    ['who may create a workspace', [Permission.CREATE_WORKSPACE]],
    ['who may not', []],
  ])(
    'offers the account page and the sign-out under the card to a user %s',
    async (_who, permissions) => {
      holding(permissions);
      setUp(() => Promise.resolve([]));

      expect(await screen.findByText('Signed in as ada')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account');
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    },
  );
});
