import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { contextStore } from '@platform/context';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectGroupRepository } from '@base/features/project/domain/repository/project-group.repository.ts';
import type {
  ProjectRepository,
} from '@base/features/project/domain/repository/project.repository.ts';
import { RECENT_COLORS_KEY } from '../../recent-colors.user-state.ts';
import EditProjectDialog from './EditProjectDialog.svelte';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const project = (overrides: Partial<ProjectEntity> = {}): ProjectEntity => ({
  id: 'project-1',
  workspaceId: 'org-1',
  name: 'web',
  description: 'the web app',
  ...overrides,
});

let teardown: Array<() => void> = [];
let update: ReturnType<typeof vi.fn>;
let setIcon: ReturnType<typeof vi.fn>;
let move: ReturnType<typeof vi.fn>;

const GROUPS = [
  { id: 'g-1', workspaceId: 'org-1', name: 'Deploys', color: 'chart-3' },
  { id: 'g-2', workspaceId: 'org-1', name: 'Backend' },
];

const install = (saved: ProjectEntity = project()) => {
  update = vi.fn().mockResolvedValue(saved);
  setIcon = vi.fn().mockResolvedValue(saved);
  const repository = {
    getByWorkspaceId: vi.fn(),
    create: vi.fn(),
    update,
    setIcon,
    delete: vi.fn(),
  } as unknown as ProjectRepository;

  move = vi.fn(({ id, groupId }: { id: string; groupId?: string }) =>
    Promise.resolve({ ...saved, id, groupId }),
  );
  const groups = {
    list: vi.fn().mockResolvedValue(GROUPS),
    move,
  } as unknown as ProjectGroupRepository;

  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ project: { projectRepository: repository, projectGroupRepository: groups } }),
  ];
};

const iconField = () => screen.getByRole('group', { name: 'Icon' });
/** Back of the editor of the icon, a second screen of the dialog. */
const back = () =>
  within(screen.getByRole('region', { name: 'Icon' })).getByRole('button', { name: 'Back' });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem(RECENT_COLORS_KEY);
  contextStore.setState({ workspace: { id: 'org-1', name: 'Acme', slug: null } });
});

afterEach(() => teardown.forEach(restore => restore()));

describe('EditProjectDialog', () => {
  it('prefills the current name and description, ready to save unmodified', async () => {
    install();
    render(EditProjectDialog, { open: true, setOpen: vi.fn(), project: project() });
    await focusSettled();

    expect(screen.getByLabelText('Project name')).toHaveValue('web');
    expect(screen.getByLabelText('Description')).toHaveValue('the web app');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('falls back to a generic placeholder, and a blank prefill, when there is no description', async () => {
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ description: '' }),
    });
    await focusSettled();

    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveAttribute(
      'placeholder',
      'Add a description...',
    );
  });

  it('saves a project that has no description', async () => {
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ description: '' }),
    });
    await focusSettled();

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('submits the trimmed changes for this project id and closes on success', async () => {
    const setOpen = vi.fn();
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen,
      project: project({ id: 'project-9' }),
    });
    await focusSettled();

    const nameInput = screen.getByLabelText('Project name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, '  renamed  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('project-9', 'renamed', 'the web app', undefined),
    );
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('starts on the icon of the project, with Reset on', async () => {
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ icon: { kind: 'glyph', name: 'rocket', color: 'chart-2' } }),
    });
    await focusSettled();

    expect(within(iconField()).getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('saves the icon with the name in one update, only at Save', async () => {
    const setOpen = vi.fn();
    install();
    render(EditProjectDialog, { open: true, setOpen, project: project() });
    await focusSettled();

    await userEvent.click(within(iconField()).getByRole('button', { name: 'Change the icon' }));
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Color 2' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    expect(update).not.toHaveBeenCalled();
    // The editor is a second screen of the dialog: Back gives the form and Save again.
    await userEvent.click(back());

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('project-1', 'web', 'the web app', {
        kind: 'glyph',
        name: 'rocket',
        color: 'chart-2',
      }),
    );
    expect(setIcon).not.toHaveBeenCalled();
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('puts the project back on the default icon with Reset, at Save', async () => {
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ icon: { kind: 'glyph', name: 'rocket', color: '#e879f9' } }),
    });
    await focusSettled();

    await userEvent.click(within(iconField()).getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('project-1', 'web', 'the web app', { kind: 'default' }),
    );
  });

  it('keeps the free color of a saved icon in the recent colors', async () => {
    install();
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ icon: { kind: 'glyph', name: 'rocket', color: '#e879f9' } }),
    });
    await focusSettled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) ?? '[]')).toEqual(['#E879F9']),
    );
  });

  it('forgets the icon that Cancel did not save, at the next opening', async () => {
    const setOpen = vi.fn();
    install();
    const view = render(EditProjectDialog, { open: true, setOpen, project: project() });
    await focusSettled();

    await userEvent.click(within(iconField()).getByRole('button', { name: 'Change the icon' }));
    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(back());
    expect(within(iconField()).getByRole('button', { name: 'Reset' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(setOpen).toHaveBeenCalledWith(false);

    await view.rerender({ open: false, setOpen, project: project() });
    await view.rerender({ open: true, setOpen, project: project() });
    await focusSettled();

    expect(within(iconField()).getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
    expect(setIcon).not.toHaveBeenCalled();
  });

  it('starts on the group of the project, and moves it only to another group', async () => {
    const setOpen = vi.fn();
    install(project({ groupId: 'g-1' }));
    render(EditProjectDialog, { open: true, setOpen, project: project({ groupId: 'g-1' }) });
    await focusSettled();

    const field = screen.getByRole('combobox', { name: 'Group' });
    await waitFor(() => expect(field).toHaveTextContent('Deploys'));
    await userEvent.click(field);
    await userEvent.click(await findFloating('option', 'Backend'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(move).toHaveBeenCalledWith({ id: 'project-1', groupId: 'g-2' }));
    expect(update).toHaveBeenCalledWith('project-1', 'web', 'the web app', undefined);
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('does not move a project that keeps its group', async () => {
    const setOpen = vi.fn();
    install(project({ groupId: 'g-1' }));
    render(EditProjectDialog, { open: true, setOpen, project: project({ groupId: 'g-1' }) });
    await focusSettled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
    expect(move).not.toHaveBeenCalled();
  });

  it('takes a project out of its group with « No group »', async () => {
    install(project({ groupId: 'g-1' }));
    render(EditProjectDialog, {
      open: true,
      setOpen: vi.fn(),
      project: project({ groupId: 'g-1' }),
    });
    await focusSettled();

    await userEvent.click(screen.getByRole('combobox', { name: 'Group' }));
    await userEvent.click(await findFloating('option', 'No group'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(move).toHaveBeenCalledWith({ id: 'project-1', groupId: undefined }),
    );
  });
});
