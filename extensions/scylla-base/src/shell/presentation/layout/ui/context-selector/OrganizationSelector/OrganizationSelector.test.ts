import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.svelte.ts';

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
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import InSidebar from '../../__test__/InSidebar.fixture.svelte';
import OrganizationSelector from './OrganizationSelector.svelte';

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
    Promise.resolve(
      ScyllaResult.success([
        { id: 'org-1', name: 'Acme Corp' },
        { id: 'org-2', name: 'Globex Inc' },
      ]),
    );
  const create = (name: string) => Promise.resolve(ScyllaResult.success({ id: 'org-3', name }));
  teardown = [
    cache.restore,
    withRegistry({ organization: { organizationRepository: { getMine, create } } }),
  ];
  contextStore.setState({ organization: { id: 'org-1', name: 'Acme Corp' } });
  permissionsStore.setState({ permissions: null });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  navigator.restore();
});

describe('OrganizationSelector', () => {
  it('shows the active organization', () => {
    render(InSidebar, { component: OrganizationSelector });

    expect(screen.getByRole('button', { name: /Acme Corp/ })).toBeInTheDocument();
  });

  it('asks the user to select an organization when none is active', () => {
    contextStore.setState({ organization: { id: null, name: null } });
    render(InSidebar, { component: OrganizationSelector });

    expect(screen.getByRole('button', { name: /Select Organization/ })).toBeInTheDocument();
  });

  it('lists the organizations as menu items, and opens the one the user picks', async () => {
    render(InSidebar, { component: OrganizationSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Globex Inc'));

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/dashboard', undefined);
    expect(contextStore.getState().organization.id).toBe('org-2');
  });

  it('offers to create an organization only to a user who may', async () => {
    render(InSidebar, { component: OrganizationSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await findMenuItem('Globex Inc');

    expect(screen.queryByText('Create an organization')).not.toBeInTheDocument();
  });

  it('opens the create dialog from the menu', async () => {
    grant(Permission.CREATE_ORGANIZATION);
    render(InSidebar, { component: OrganizationSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Create an organization'));

    expect(
      await screen.findByRole('dialog', { name: 'Create a new organization' }),
    ).toBeInTheDocument();
  });

  it('creates an organization from the menu, makes it active and opens its dashboard', async () => {
    grant(Permission.CREATE_ORGANIZATION);
    render(InSidebar, { component: OrganizationSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Create an organization'));
    const dialog = await screen.findByRole('dialog', { name: 'Create a new organization' });
    await user.type(within(dialog).getByLabelText('Organization name'), 'Initech');
    await user.click(within(dialog).getByRole('button', { name: 'Create Organization' }));

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/initech/dashboard', undefined),
    );
    expect(contextStore.getState().organization).toEqual({ id: 'org-3', name: 'Initech' });
  });
});
