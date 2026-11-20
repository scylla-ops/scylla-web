import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
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

const open = () => {
  create = vi.fn().mockResolvedValue({ id: 'p-1', workspaceId: 'ws-1', name: 'web' });
  const repository = { create } as unknown as ProjectRepository;
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

  it('goes back to the choice of the kind of project', () => {
    open();

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/acme/projects/new',
    );
  });
});
