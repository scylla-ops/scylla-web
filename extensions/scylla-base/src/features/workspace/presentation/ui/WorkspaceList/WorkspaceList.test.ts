import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { WorkspaceRepository } from '@base/features/workspace/domain/repository/workspace.repository.ts';
import type {
  WorkspaceEntity,
  WorkspacePage,
  WorkspaceSearch,
} from '@base/features/workspace/domain/entities/workspace.entity.ts';
import WorkspaceList from './WorkspaceList.svelte';
import WorkspaceListFixture from './WorkspaceList.fixture.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// `animate:flip` reads the running animations, which jsdom does not have.
Element.prototype.getAnimations ??= () => [];

/** The stub of `animate()` keeps running: this ends each animation, so a row that leaves goes. */
const finishAnimations = () =>
  vi.mocked(Element.prototype.animate).mock.results.forEach(result =>
    (result.value as { finish: () => void }).finish(),
  );

const workspaces = [
  { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
  { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' },
];

/** The workspaces of other users, as the server gives them to an instance admin. */
const ownedBy = (id: string, name: string, owner: string, email: string): WorkspaceEntity => ({
  id,
  name,
  slug: id,
  personalTokensEnabled: true,
  timeZone: 'UTC',
  owner: { id: `user-${id}`, username: owner.toLowerCase(), displayName: owner, email },
  role: '',
});

const othersOf = (items: WorkspaceEntity[], total = items.length): WorkspacePage => ({
  items,
  nextToken: '',
  total,
});

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let remove: ReturnType<typeof vi.fn>;
let listAll: ReturnType<typeof vi.fn<(search: WorkspaceSearch) => Promise<WorkspacePage>>>;
let allowed: Record<string, readonly string[]>;

/** The names that the server allows on each workspace. */
const grant = (byWorkspace: Record<string, readonly string[]>) => {
  allowed = byWorkspace;
};

const setUp = (getMine: () => Promise<WorkspaceEntity[] | typeof workspaces>) => {
  remove = vi.fn().mockResolvedValue(undefined);
  const repository = { getMine, listAll, delete: remove } as unknown as WorkspaceRepository;
  const check = (object: { id: string }, names: string[]) =>
    Promise.resolve(new Set(names.filter(name => allowed[object.id]?.includes(name))));
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      workspace: { workspaceRepository: repository },
      access: { accessRepository: { check } },
    }),
  ];
};

/** The instance view of the workspaces: the user is an instance admin. */
const seeAllWorkspaces = () =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.SYSTEM,
          scopeId: '',
          access: { kind: 'restricted', permissions: [Permission.LIST_ALL_WORKSPACES] },
        },
      ],
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  listAll = vi.fn().mockResolvedValue(othersOf([]));
  navigator = installTestNavigator();
  allowed = {};
  permissionsStore.setState({ permissions: null });
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: null } });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('WorkspaceList', () => {
  it('shows no workspace while the list is loading', () => {
    setUp(() => new Promise(() => {}));
    render(WorkspaceList);

    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
  });

  it('lists the workspaces of the user', async () => {
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
  });

  it('makes a selected workspace active and opens its dashboard', async () => {
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    await fireEvent.click(await screen.findByText('Globex Inc'));

    expect(contextStore.getState().workspace).toEqual({ id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' });
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/dashboard', undefined);
  });

  it('hides the row actions that the user may not use', async () => {
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);
    await screen.findByText('Acme Corp');
    await new Promise(resolve => setTimeout(resolve));

    expect(screen.queryByRole('button', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('shows the actions on a workspace that is not the active one', async () => {
    grant({ 'org-2': ['list_access', 'update_workspace', 'delete_workspace'] });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(await screen.findByLabelText('Address')).toHaveAttribute('placeholder', 'globex-inc');
    expect(screen.getAllByRole('button', { name: 'Delete', hidden: true })).toHaveLength(1);
  });

  it('does not take the rights of the active workspace for another workspace', async () => {
    grant({ 'org-1': ['update_workspace'], 'org-2': ['list_access'] });
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.WORKSPACE,
            scopeId: 'org-1',
            access: { kind: 'restricted', permissions: [Permission.DELETE_WORKSPACE] },
          },
        ],
      },
    });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    expect(await screen.findByLabelText('Address')).toHaveAttribute('placeholder', 'acme-corp');
    expect(screen.queryByRole('button', { name: 'Delete', hidden: true })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Members', hidden: true })).toHaveLength(1);
  });

  it('opens the members of a workspace without also selecting the row', async () => {
    grant({ 'org-1': ['list_access'], 'org-2': ['list_access'] });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    const [, globexMembers] = await screen.findAllByRole('button', { name: 'Members' });
    await userEvent.click(globexMembers);

    expect(navigator.navigate).toHaveBeenCalledTimes(1);
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/access/members', undefined);
    expect(contextStore.getState().workspace.id).toBe('org-2');
  });

  it('opens the edit dialog for a workspace', async () => {
    grant({ 'org-1': ['update_workspace'], 'org-2': ['update_workspace'] });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    const [acmeEdit] = await screen.findAllByRole('button', { name: 'Edit' });
    await userEvent.click(acmeEdit);

    expect(await screen.findByRole('dialog', { name: 'Edit workspace' })).toBeInTheDocument();
  });

  it('moves to another workspace after deleting the active one', async () => {
    grant({ 'org-1': ['delete_workspace'], 'org-2': ['delete_workspace'] });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    const [acmeDelete] = await screen.findAllByRole('button', { name: 'Delete' });
    await userEvent.click(acmeDelete);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('org-1'));
    await waitFor(() =>
      expect(contextStore.getState().workspace).toEqual({ id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' }),
    );
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/dashboard', undefined);
  });

  it('keeps the active workspace after deleting another one', async () => {
    grant({ 'org-1': ['delete_workspace'], 'org-2': ['delete_workspace'] });
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    const [, globexDelete] = await screen.findAllByRole('button', { name: 'Delete' });
    await userEvent.click(globexDelete);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('org-2'));
    expect(contextStore.getState().workspace.id).toBe('org-1');
    expect(navigator.navigate).not.toHaveBeenCalled();
  });

  it('renders each row with the row component that the caller gives', async () => {
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceListFixture);

    await screen.findByText('Acme Corp');
    expect(screen.getAllByTestId('custom-row')).toHaveLength(2);

    await userEvent.click(screen.getAllByRole('button', { name: 'pick' })[1]);
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/dashboard', undefined);
  });

  describe('for an instance admin', () => {
    const alice: WorkspaceEntity = {
      ...ownedBy('ws-alice', 'Personal', 'Alice Martin', 'alice@example.test'),
      icon: { kind: 'glyph', name: 'rocket', color: 'chart-2' },
    };
    const bob = ownedBy('ws-bob', 'Personal', 'Bob Stone', 'bob@example.test');

    it('keeps the switcher of a user without the instance view: no section, no owner', async () => {
      setUp(() => Promise.resolve(workspaces));
      render(WorkspaceList);

      await screen.findByText('Acme Corp');

      expect(screen.queryByText('Your workspaces')).not.toBeInTheDocument();
      expect(screen.queryByText('All workspaces…')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(listAll).not.toHaveBeenCalled();
    });

    it('shows its own workspaces first, then a few others with their owner', async () => {
      seeAllWorkspaces();
      listAll.mockResolvedValue(othersOf([alice, bob], 31));
      setUp(() => Promise.resolve(workspaces));
      render(WorkspaceList);

      expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
      const texts = screen
        .getAllByText(/Your workspaces|Acme Corp|Other workspaces|Alice Martin|Bob Stone/)
        .map(element => element.textContent);
      expect(texts).toEqual([
        'Your workspaces',
        'Acme Corp',
        'Other workspaces',
        'Alice Martin',
        'Bob Stone',
      ]);
      expect(listAll).toHaveBeenCalledWith({
        query: '',
        order: 'activity',
        othersOnly: true,
        pageSize: 5,
        pageToken: '',
      });
      expect(screen.getByText('All workspaces…')).toBeInTheDocument();
      expect(screen.getByText('31')).toBeInTheDocument();
      // The icon of each workspace, before its name and its owner. No icon: a building in grey.
      const glyphOf = (owner: string) =>
        screen
          .getByText(owner)
          .closest('div')
          ?.querySelector('[data-slot="workspace-icon"] svg')
          ?.getAttribute('stroke');
      expect(glyphOf('Alice Martin')).toBe('var(--chart-2)');
      expect(glyphOf('Bob Stone')).toBe('var(--muted-foreground)');
    });

    it('opens the workspace of another user from its row', async () => {
      seeAllWorkspaces();
      listAll.mockResolvedValue(othersOf([alice]));
      setUp(() => Promise.resolve(workspaces));
      render(WorkspaceList);

      await fireEvent.click(await screen.findByText('Alice Martin'));

      expect(contextStore.getState().workspace).toEqual({
        id: 'ws-alice',
        name: 'Personal',
        slug: 'ws-alice',
      });
      expect(navigator.navigate).toHaveBeenCalledWith('/ws-alice/dashboard', undefined);
    });

    it('searches the others on the server, by owner', async () => {
      seeAllWorkspaces();
      listAll.mockImplementation(search =>
        Promise.resolve(othersOf(search.query === 'martin' ? [alice] : [alice, bob])),
      );
      setUp(() => Promise.resolve(workspaces));
      render(WorkspaceList);
      await screen.findByText('Bob Stone');

      await userEvent.type(screen.getByRole('textbox'), 'martin');

      await waitFor(() =>
        expect(listAll).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'martin' })),
      );
      await waitFor(() => {
        finishAnimations();
        expect(screen.queryByText('Bob Stone')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });

    it('opens "All workspaces…" with the text of the search', async () => {
      seeAllWorkspaces();
      setUp(() => Promise.resolve(workspaces));
      render(WorkspaceList);
      await screen.findByText('Acme Corp');

      await userEvent.type(screen.getByRole('textbox'), 'alice');
      await fireEvent.click(screen.getByText('All workspaces…'));

      expect(navigator.navigate).toHaveBeenCalledWith('/admin/workspaces?q=alice', undefined);
    });
  });
});
