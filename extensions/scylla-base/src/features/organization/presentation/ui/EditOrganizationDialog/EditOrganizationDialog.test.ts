import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { OrganizationRepository } from '@base/features/organization/domain/repository/organization.repository.ts';
import EditOrganizationDialog from './EditOrganizationDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

let teardown: Array<() => void> = [];
let update: ReturnType<typeof vi.fn>;

const setUp = (
  organization: { id: string; name: string; slug: string },
  setOpen: (open: boolean) => void = vi.fn(),
) => {
  update = vi.fn().mockResolvedValue({ ...organization });
  const repository = { update } as unknown as OrganizationRepository;

  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({ organization: { organizationRepository: repository } }),
  ];

  return render(EditOrganizationDialog, { open: true, setOpen, organization });
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => teardown.forEach(restore => restore()));

describe('EditOrganizationDialog', () => {
  it('starts with blank fields — the current values are placeholders — so Save starts disabled', async () => {
    setUp({ id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' });
    await focusSettled();

    expect(screen.getByLabelText('Workspace name')).toHaveValue('');
    expect(screen.getByLabelText('Workspace name')).toHaveAttribute('placeholder', 'Acme Corp');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
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

    await waitFor(() => expect(update).toHaveBeenCalledWith('org-9', 'New Name', 'new-desc'));
    await waitFor(() => expect(setOpen).toHaveBeenCalledWith(false));
  });
});
