import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import NewRegularProjectPage from './NewRegularProject.page.svelte';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

let teardown: Array<() => void> = [];
let create: ReturnType<typeof vi.fn>;
let setIcon: ReturnType<typeof vi.fn>;
let groups: {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  move: ReturnType<typeof vi.fn>;
};

const created = { id: 'p-1', workspaceId: 'ws-1', name: 'web' };
const DEPLOYS = { id: 'g-1', workspaceId: 'ws-1', name: 'Deploys', color: 'chart-3' };

const open = (
  saveIcon: () => Promise<unknown> = () => Promise.resolve(created),
  search = '',
) => {
  create = vi.fn().mockResolvedValue(created);
  setIcon = vi.fn(saveIcon);
  groups = {
    list: vi.fn().mockResolvedValue([DEPLOYS]),
    create: vi.fn((_: string, name: string, color?: string) =>
      Promise.resolve({ id: 'g-2', workspaceId: 'ws-1', name, ...(color && { color }) }),
    ),
    move: vi.fn(({ id, groupId }: { id: string; groupId?: string }) =>
      Promise.resolve({ ...created, id, groupId }),
    ),
  };
  const repository = { create, setIcon } as unknown as ProjectRepository;
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/projects/new/regular', search });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      project: {
        projectRepository: repository,
        projectGroupRepository: groups as unknown as ProjectGroupRepository,
      },
    }),
  ];
  render(NewRegularProjectPage);
  return navigator;
};

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create project' }));

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
  grant([Permission.CREATE_PROJECT, Permission.UPDATE_PROJECT]);
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

const groupField = () => screen.getByRole('combobox', { name: 'Group' });

describe('NewRegularProjectPage', () => {
  it('creates the project in the current workspace, then opens the list of the projects', async () => {
    const { navigate } = open();
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Project name'), '  web ');
    await userEvent.type(screen.getByLabelText('Description'), '  the web app  ');
    await submit();

    await waitFor(() => expect(create).toHaveBeenCalledWith('web', 'ws-1', 'the web app'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined));
  });

  it('needs a name, and sends a blank description as no description', async () => {
    open();
    await focusSettled();

    expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await userEvent.type(screen.getByLabelText('Description'), '   ');
    await submit();

    await waitFor(() => expect(create).toHaveBeenCalledWith('web', 'ws-1', undefined));
  });

  it('toasts an error and creates nothing with no workspace', async () => {
    contextStore.setState({ workspace: { id: null, name: null, slug: null } });
    open();
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    expect(toastError).toHaveBeenCalledWith(
      'Project name is required and you must select a workspace.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('creates nothing more than the project with the default icon', async () => {
    open();
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(setIcon).not.toHaveBeenCalled();
  });

  it('gives the chosen icon to the new project, in the same action', async () => {
    const { navigate } = open();
    await focusSettled();

    const field = screen.getByRole('group', { name: 'Icon' });
    await userEvent.click(within(field).getByRole('button', { name: 'Change the icon' }));
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Color 3' }));
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    expect(create).not.toHaveBeenCalled();
    await submit();

    await waitFor(() =>
      expect(setIcon).toHaveBeenCalledWith('p-1', {
        kind: 'glyph',
        name: 'rocket',
        color: 'chart-3',
      }),
    );
    expect(create).toHaveBeenCalledWith('web', 'ws-1', undefined);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the project when only its icon fails, and tells it', async () => {
    const { navigate } = open(() => Promise.reject(new Error('image refused')));
    await focusSettled();

    const field = screen.getByRole('group', { name: 'Icon' });
    await userEvent.click(within(field).getByRole('button', { name: 'Change the icon' }));
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'The project is created, but its icon is not saved: An unexpected error occurred',
      ),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined));
  });

  it('goes back to the choice of the kind of project', () => {
    open();

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/acme/projects/new',
    );
  });

  it('creates the project in no group, with no move, while the group stays « No group »', async () => {
    open();
    await focusSettled();

    expect(groupField()).toHaveTextContent('No group');
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(groups.move).not.toHaveBeenCalled();
  });

  it('starts on the group of the button that opened it, and puts the project in it', async () => {
    const { navigate } = open(undefined, '?group=g-1');
    await focusSettled();

    await waitFor(() => expect(groupField()).toHaveTextContent('Deploys'));
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/acme/projects/new?group=g-1',
    );
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() => expect(groups.move).toHaveBeenCalledWith({ id: 'p-1', groupId: 'g-1' }));
    expect(create).toHaveBeenCalledWith('web', 'ws-1', undefined);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('lists each group with its folder color, and moves the project to the chosen one', async () => {
    open();
    await focusSettled();

    await userEvent.click(groupField());
    const option = await findFloating('option', 'Deploys');
    expect(option.querySelector('[data-slot="color-glyph"] svg')).toHaveAttribute(
      'stroke',
      'var(--chart-3)',
    );
    await userEvent.click(option);
    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() => expect(groups.move).toHaveBeenCalledWith({ id: 'p-1', groupId: 'g-1' }));
  });

  it('creates a new group with its name, then puts the project in it', async () => {
    open();
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await userEvent.click(groupField());
    await userEvent.click(await findFloating('option', 'New group…'));
    // A new group needs its name.
    expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name of the new group'), 'Backend');
    await submit();

    await waitFor(() => expect(groups.create).toHaveBeenCalledWith('ws-1', 'Backend', undefined));
    await waitFor(() => expect(groups.move).toHaveBeenCalledWith({ id: 'p-1', groupId: 'g-2' }));
  });

  it('offers no « New group… » to a person who cannot change the groups', async () => {
    grant([Permission.CREATE_PROJECT]);
    open();
    await focusSettled();

    await userEvent.click(groupField());
    await findFloating('option', 'Deploys');

    const options = screen.queryAllByRole('option', { hidden: true });
    expect(options.map(option => option.textContent?.trim())).toEqual(['No group', 'Deploys']);
  });

  it('keeps the project when only its group fails, and tells it', async () => {
    const { navigate } = open(undefined, '?group=g-1');
    groups.move.mockRejectedValue(new Error('group refused'));
    await focusSettled();

    await userEvent.type(screen.getByLabelText('Project name'), 'web');
    await submit();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'The project is created, but it is not in its group: An unexpected error occurred',
      ),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/acme/projects', undefined));
  });
});
