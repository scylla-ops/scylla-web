import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';

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
import { loadAddWorkspaceDialog, loadWorkspaceList } from '@base/features/workspace';
import InSidebar from '@base/shell/presentation/layout/ui/__test__/InSidebar.fixture.svelte';
import WorkspaceSelector from './WorkspaceSelector.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let teardown: Array<() => void> = [];
let navigator: ReturnType<typeof installTestNavigator>;

const TWO = [
  { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
  { id: 'org-2', name: 'Globex Inc', slug: 'globex-inc' },
];
let mine = TWO;

const grant = (...permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        { scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'restricted', permissions } },
      ],
    },
  });

beforeAll(async () => {
  await Promise.all([loadWorkspaceList(), loadAddWorkspaceDialog()]);
});

beforeEach(() => {
  navigator = installTestNavigator();
  const cache = withQueryClient();
  mine = TWO;
  const getMine = () => Promise.resolve(mine);
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
  describe('the filter field', () => {
    const SIX = [
      ...TWO,
      ...['Initech', 'Hooli', 'Umbrella', 'Stark Industries'].map((name, index) => ({
        id: `org-${index + 3}`,
        name,
        slug: name.toLowerCase().replace(' ', '-'),
      })),
    ];
    // By its placeholder: the list has no position in jsdom, so its fields have no accessible name.
    const filterField = () => screen.findByPlaceholderText<HTMLInputElement>('Find a workspace');
    /** The body takes clicks again just after the menu goes. */
    const closed = (field: HTMLElement) =>
      waitFor(() => {
        expect(field).not.toBeInTheDocument();
        expect(document.body.style.pointerEvents).not.toBe('none');
      });
    const items = () =>
      screen.getAllByRole('menuitem', { hidden: true }).map(item => item.textContent.trim());

    const open = async () => {
      const user = userEvent.setup();
      render(InSidebar, { component: WorkspaceSelector });
      await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
      const field = await filterField();
      await focusSettled();
      return { user, field };
    };

    beforeEach(() => {
      mine = SIX;
    });

    it('does not show for a short list', async () => {
      mine = TWO;
      const user = userEvent.setup();
      render(InSidebar, { component: WorkspaceSelector });

      await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
      await findMenuItem('Globex Inc');

      expect(screen.queryByRole('textbox', { hidden: true })).not.toBeInTheDocument();
    });

    it('holds the focus when the menu opens, also on the next open', async () => {
      const { user, field } = await open();
      expect(field).toHaveFocus();

      await user.keyboard('{Escape}');
      await closed(field);
      await user.click(screen.getByRole('button', { name: /Acme Corp/ }));

      const again = await filterField();
      await focusSettled();
      expect(again).toHaveFocus();
    });

    it('keeps the letters in the field and narrows the rows', async () => {
      const { user, field } = await open();

      await user.keyboard('hoo');

      expect(field).toHaveFocus();
      expect(field.value).toBe('hoo');
      expect(items()).toEqual(['Hooli']);
    });

    it('opens the first match on Enter, and the menu closes', async () => {
      const { user, field } = await open();

      await user.keyboard('umb{Enter}');

      expect(navigator.navigate).toHaveBeenCalledWith('/umbrella/dashboard', undefined);
      await closed(field);
    });

    it('opens no row on Enter with no text', async () => {
      const { user } = await open();

      await user.keyboard('{Enter}');

      expect(navigator.navigate).not.toHaveBeenCalled();
    });

    it('goes to the first row on ArrowDown, and the arrows then move in the rows', async () => {
      const { user } = await open();

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toHaveTextContent('Acme Corp');

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toHaveTextContent('Globex Inc');
    });

    it('closes the menu on Escape', async () => {
      const { user, field } = await open();

      await user.keyboard('hoo{Escape}');

      await waitFor(() => expect(field).not.toBeInTheDocument());
    });

    it('says when no workspace matches', async () => {
      const { user } = await open();

      await user.keyboard('zzz');

      expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
        'No workspace matches this search.',
      );
    });

    it('forgets the text when the menu closes', async () => {
      const { user, field } = await open();

      await user.keyboard('hoo{Escape}');
      await closed(field);
      await user.click(screen.getByRole('button', { name: /Acme Corp/ }));

      await findMenuItem('Globex Inc');
      expect(items()).toHaveLength(SIX.length);
    });
  });

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

    expect(navigator.navigate).toHaveBeenCalledWith('/globex-inc/dashboard', undefined);
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

  it('creates a workspace from the menu, makes it active and opens its dashboard', async () => {
    grant(Permission.CREATE_WORKSPACE);
    render(InSidebar, { component: WorkspaceSelector });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Acme Corp/ }));
    await user.click(await findMenuItem('Create a workspace'));
    const dialog = await screen.findByRole('dialog', { name: 'Create a new workspace' });
    await user.type(within(dialog).getByLabelText('Workspace name'), 'Initech');
    await user.click(within(dialog).getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('/initech/dashboard', undefined),
    );
    expect(contextStore.getState().workspace).toEqual({ id: 'org-3', name: 'Initech', slug: 'initech' });
  });
});
