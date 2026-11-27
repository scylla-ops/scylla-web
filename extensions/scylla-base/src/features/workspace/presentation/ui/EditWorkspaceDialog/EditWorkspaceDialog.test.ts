import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { WorkspaceEntity } from '@base/features/workspace/domain/entities/workspace.entity.ts';
import type { WorkspaceRepository } from '@base/features/workspace/domain/repository/workspace.repository.ts';
import EditWorkspaceDialog from './EditWorkspaceDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

let teardown: Array<() => void> = [];
let update: ReturnType<typeof vi.fn>;

const setUp = (
  workspace: Pick<WorkspaceEntity, 'id' | 'name' | 'slug' | 'icon'>,
  setOpen: (open: boolean) => void = vi.fn(),
) => {
  update = vi.fn().mockResolvedValue({ ...workspace });
  const repository = { update } as unknown as WorkspaceRepository;

  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ workspace: { workspaceRepository: repository } }),
  ];

  return render(EditWorkspaceDialog, { open: true, setOpen, workspace });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => teardown.forEach(restore => restore()));

describe('EditWorkspaceDialog', () => {
  it('starts with blank fields: the current values are placeholders', async () => {
    setUp({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
    await focusSettled();

    expect(screen.getByLabelText('Workspace name')).toHaveValue('');
    expect(screen.getByLabelText('Workspace name')).toHaveAttribute('placeholder', 'Acme Corp');
  });

  it('a new name alone leaves the address as it is', async () => {
    const user = userEvent.setup();
    setUp({ id: 'org-9', name: 'Acme Corp', slug: 'acme-corp' });
    await focusSettled();

    await user.type(screen.getByLabelText('Workspace name'), 'New Name');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('org-9', 'New Name', undefined, undefined));
  });

  it('a new address alone leaves the name as it is', async () => {
    const user = userEvent.setup();
    setUp({ id: 'org-9', name: 'Acme Corp', slug: 'acme-corp' });
    await focusSettled();

    await user.type(screen.getByLabelText('Address'), 'new-address');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('org-9', undefined, 'new-address', undefined));
  });

  it('closes with no call to the server when the two fields stay blank', async () => {
    const setOpen = vi.fn();
    const user = userEvent.setup();
    setUp({ id: 'org-9', name: 'Acme Corp', slug: 'acme-corp' }, setOpen);
    await focusSettled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
    expect(update).not.toHaveBeenCalled();
  });

  it('shows the current address as the placeholder of its field', async () => {
    setUp({ id: 'org-1', name: 'Acme', slug: 'acme' });
    await focusSettled();

    expect(screen.getByLabelText('Address')).toHaveAttribute('placeholder', 'acme');
  });

  it('submits the trimmed new name and address for this id, and closes on success', async () => {
    const setOpen = vi.fn();
    const user = userEvent.setup();
    setUp({ id: 'org-9', name: 'Acme Corp', slug: 'acme-corp' }, setOpen);
    await focusSettled();

    await user.type(screen.getByLabelText('Workspace name'), '  New Name  ');
    await user.type(screen.getByLabelText('Address'), '  new-desc  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledWith('org-9', 'New Name', 'new-desc', undefined));
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });

  it('starts on the icon of the workspace, and saves a new icon alone', async () => {
    const user = userEvent.setup();
    setUp({
      id: 'org-9',
      name: 'Acme Corp',
      slug: 'acme-corp',
      icon: { kind: 'glyph', name: 'rocket', color: 'chart-3' },
    });
    await focusSettled();

    const field = screen.getByRole('group', { name: 'Icon' });
    expect(within(field).getByRole('button', { name: 'Reset' })).toBeEnabled();
    await user.click(within(field).getByRole('button', { name: 'Change the icon' }));
    await user.click(screen.getByRole('button', { name: 'Color 2' }));
    // The editor is a second screen of the dialog: Back gives the form and Save again.
    const editor = screen.getByRole('region', { name: 'Icon' });
    await user.click(within(editor).getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('org-9', undefined, undefined, {
        kind: 'glyph',
        name: 'rocket',
        color: 'chart-2',
      }),
    );
  });

  it('sends nothing for a workspace that keeps the default icon', async () => {
    const user = userEvent.setup();
    setUp({ id: 'org-9', name: 'Acme Corp', slug: 'acme-corp' });
    await focusSettled();
    // No icon: Reset is off, and Save sends nothing.
    const field = screen.getByRole('group', { name: 'Icon' });
    expect(within(field).getByRole('button', { name: 'Reset' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(update).not.toHaveBeenCalled();
  });
});
