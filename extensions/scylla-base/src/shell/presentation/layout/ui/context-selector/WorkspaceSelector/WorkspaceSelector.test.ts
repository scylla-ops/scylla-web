import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';

const findMenuItem = async (text: string) => {
  let item: HTMLElement | undefined;
  await waitFor(() => {
    item = screen
      .getAllByRole('menuitem', { hidden: true })
      .find(element => element.textContent?.includes(text));
    expect(item).toBeDefined();
  });
  return item as HTMLElement;
};
import InSidebar from '@base/shell/presentation/layout/ui/__test__/InSidebar.fixture.svelte';
import WorkspaceSelector from './WorkspaceSelector.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;

const grant = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

beforeEach(() => {
  navigator = installTestNavigator();
  const cache = withQueryClient();
  const getMine = () =>
    Promise.resolve([
      { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
      { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' },
    ]);
  const create = (name: string) => Promise.resolve({ id: 'org-3', name, slug: name.toLowerCase() });
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: { getMine, create } } }),
  ];
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' } });
  permissionsStore.setState({ permissions: null });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('WorkspaceSelector', () => {
  it('shows the active workspace', () => {
    render(InSidebar, { component: WorkspaceSelector });

    expect(screen.getByRole('button', { name: /Acme Corp/ })).toBeInTheDocument();
  });

  it('asks the user to select a workspace when none is active', () => {
    contextStore.setState({ workspace: { id: null, name: null, slug: null } });
    render(InSidebar, { component: WorkspaceSelector });

    expect(screen.getByRole('button', { name: /Select Workspace/ })).toBeInTheDocument();
  });

  it('lists the workspaces as menu items, and opens the one the user picks', async () => {
    render(InSidebar, { component: WorkspaceSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Globex Inc'));

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/projects', undefined);
    expect(contextStore.getState().workspace.id).toBe('org-2');
  });

  it('offers to create a workspace only to a user who may', async () => {
    render(InSidebar, { component: WorkspaceSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await findMenuItem('Globex Inc');

    expect(screen.queryByText('Create a workspace')).not.toBeInTheDocument();
  });

  it('opens the create dialog from the menu', async () => {
    grant(Permission.CREATE_WORKSPACE);
    render(InSidebar, { component: WorkspaceSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Create a workspace'));

    expect(
      await screen.findByRole('dialog', { name: 'Create a new workspace' }),
    ).toBeInTheDocument();
  });

  it('creates a workspace from the menu, makes it active and opens its projects', async () => {
    grant(Permission.CREATE_WORKSPACE);
    render(InSidebar, { component: WorkspaceSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Create a workspace'));
    const dialog = await screen.findByRole('dialog', { name: 'Create a new workspace' });
    await user.type(within(dialog).getByLabelText('Workspace name'), 'Initech');
    await user.click(within(dialog).getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/initech/projects', undefined),
    );
    expect(contextStore.getState().workspace).toEqual({ id: 'org-3', name: 'Initech', slug: 'initech' });
  });
});
