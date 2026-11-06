import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import type { WorkspaceRepository } from '@base/features/workspace/domain/repository/workspace.repository.ts';
import WorkspaceList from './WorkspaceList.svelte';
import WorkspaceListFixture from './WorkspaceList.fixture.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const workspaces = [
  { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
  { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' },
];

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;
let remove: ReturnType<typeof vi.fn>;
let allowed: Record<string, readonly string[]>;

/** The names that the server allows on each workspace. */
const grant = (byWorkspace: Record<string, readonly string[]>) => {
  allowed = byWorkspace;
};

const setUp = (getMine: () => Promise<typeof workspaces>) => {
  remove = vi.fn().mockResolvedValue(undefined);
  const repository = { getMine, delete: remove } as unknown as WorkspaceRepository;
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

beforeEach(() => {
  vi.clearAllMocks();
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

  it('makes a selected workspace active and opens its projects', async () => {
    setUp(() => Promise.resolve(workspaces));
    render(WorkspaceList);

    await fireEvent.click(await screen.findByText('Globex Inc'));

    expect(contextStore.getState().workspace).toEqual({ id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' });
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', undefined);
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
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', undefined);
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
    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', undefined);
  });
});
