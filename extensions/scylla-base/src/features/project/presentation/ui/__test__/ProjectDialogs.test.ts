import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { contextStore } from '@platform/context';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type {
  ProjectRepository,
} from '@base/features/project/domain/repository/project.repository.ts';
import EditProjectDialog from '../EditProjectDialog.svelte';

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
let create: ReturnType<typeof vi.fn>;
let update: ReturnType<typeof vi.fn>;

const install = () => {
  create = vi.fn().mockResolvedValue(project());
  update = vi.fn().mockResolvedValue(project());
  const repository = {
    getByWorkspaceId: vi.fn(),
    create,
    update,
    delete: vi.fn(),
  } as unknown as ProjectRepository;

  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ project: { projectRepository: repository } })];
};

beforeEach(() => {
  vi.clearAllMocks();
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
      expect(update).toHaveBeenCalledWith('project-9', 'renamed', 'the web app'),
    );
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });
});
