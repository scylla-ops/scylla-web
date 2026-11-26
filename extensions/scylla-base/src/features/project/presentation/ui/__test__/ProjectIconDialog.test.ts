import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectRepository } from '@base/features/project/domain/repository/project.repository.ts';
import { RECENT_COLORS_KEY } from '../../recent-colors.user-state.ts';
import ProjectIconDialog from '../ProjectIconDialog/ProjectIconDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const project = (overrides: Partial<ProjectEntity> = {}): ProjectEntity => ({
  id: 'project-1',
  workspaceId: 'org-1',
  name: 'staging',
  ...overrides,
});

let teardown: Array<() => void> = [];
let setIcon: ReturnType<typeof vi.fn>;

const open = async (current: ProjectEntity = project()) => {
  setIcon = vi.fn().mockResolvedValue(current);
  const repository = { setIcon } as unknown as ProjectRepository;
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ project: { projectRepository: repository } })];
  const onOpenChange = vi.fn();
  render(ProjectIconDialog, {
    open: true,
    onOpenChange,
    project: current,
    subtitle: 'acme/api',
  });
  await focusSettled();
  return onOpenChange;
};

beforeEach(() => localStorage.removeItem(RECENT_COLORS_KEY));

afterEach(() => teardown.forEach(restore => restore()));

describe('ProjectIconDialog', () => {
  it('shows the name and the repository of the project next to the preview', async () => {
    await open();

    expect(screen.getByRole('dialog', { name: 'Project icon' })).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('acme/api')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('saves a glyph in a color of the theme, then closes', async () => {
    const onOpenChange = await open();

    await userEvent.click(screen.getByRole('button', { name: 'rocket' }));
    await userEvent.click(screen.getByRole('button', { name: 'Color 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(setIcon).toHaveBeenCalledWith('project-1', {
        kind: 'glyph',
        name: 'rocket',
        color: 'chart-2',
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('filters the glyphs with a French keyword', async () => {
    await open();

    await userEvent.type(screen.getByRole('searchbox'), 'fusée');

    expect(screen.getByRole('button', { name: 'rocket' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'server' })).not.toBeInTheDocument();
  });

  it('puts a project back on the default icon', async () => {
    await open(project({ icon: { kind: 'glyph', name: 'rocket', color: '#e879f9' } }));

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setIcon).toHaveBeenCalledWith('project-1', { kind: 'default' }));
  });

  it('sends nothing when the icon does not change', async () => {
    const onOpenChange = await open();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(setIcon).not.toHaveBeenCalled();
  });

  it('uploads the bytes of an image', async () => {
    await open();
    const png = new File([new Uint8Array([137, 80, 78, 71])], 'icon.png', { type: 'image/png' });

    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, png);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(setIcon).toHaveBeenCalledWith('project-1', {
        kind: 'image',
        data: new Uint8Array([137, 80, 78, 71]),
      }),
    );
  });

  it('refuses a file that is too large before the upload', async () => {
    await open();
    const large = new File([new Uint8Array(1_048_577)], 'big.png', { type: 'image/png' });

    await userEvent.click(screen.getByRole('tab', { name: 'Image' }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, large);

    expect(screen.getByRole('alert')).toHaveTextContent('This file is too large: 1 MB max.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(setIcon).not.toHaveBeenCalled();
  });

  it('keeps a saved free color in the recent colors', async () => {
    await open(project({ icon: { kind: 'glyph', name: 'rocket', color: '#E879F9' } }));

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(localStorage.getItem(RECENT_COLORS_KEY)).toBe('["#E879F9"]'));
  });
});
