import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import NewRegularProjectPage from './NewRegularProject.page.svelte';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

let teardown: Array<() => void> = [];
let create: ReturnType<typeof vi.fn>;
let setIcon: ReturnType<typeof vi.fn>;

const created = { id: 'p-1', workspaceId: 'ws-1', name: 'web' };

const open = (saveIcon: () => Promise<unknown> = () => Promise.resolve(created)) => {
  create = vi.fn().mockResolvedValue(created);
  setIcon = vi.fn(saveIcon);
  const repository = { create, setIcon } as unknown as ProjectRepository;
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: '/acme/projects/new/regular' });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({ project: { projectRepository: repository } }),
  ];
  render(NewRegularProjectPage);
  return navigator;
};

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create project' }));

beforeEach(() => {
  vi.clearAllMocks();
  contextStore.setState({ workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' } });
});

afterEach(() => teardown.forEach(restore => restore()));

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
});
