import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { selectionStore } from '@scylla/ui/stores';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import type { SecretRepository } from '@base/features/secret/domain/repository/secret.repository.ts';
import SecretPage from '../Secret.page.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

let teardown: Array<() => void> = [];
let create: ReturnType<typeof vi.fn>;

const grant = (permissions: Permission[]) =>
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.PROJECT,
          scopeId: 'project-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });

const emptyState = async () =>
  (await screen.findByText('No secret yet')).closest<HTMLElement>('[data-slot="empty-state"]')!;

beforeEach(() => {
  create = vi.fn().mockResolvedValue({ id: 'secret-1', projectId: 'project-1', name: 'TOKEN' });
  const repository = {
    listByProjectId: vi.fn().mockResolvedValue([]),
    create,
    update: vi.fn(),
    listPipelinesUsing: vi.fn(),
    deleteById: vi.fn(),
  } as unknown as SecretRepository;
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ secret: { secretRepository: repository } })];
  selectionStore.setState({ selectedIds: {} });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('SecretPage', () => {
  it('offers "New secret" in the empty list, and the secret goes to the project of the page', async () => {
    grant([Permission.LIST_SECRETS, Permission.CREATE_SECRET]);
    const user = userEvent.setup();
    render(SecretPage, { projectId: 'project-1' });

    await user.click(within(await emptyState()).getByRole('button', { name: 'New secret' }));

    expect(await screen.findByRole('dialog', { name: 'Create secret' })).toBeInTheDocument();
    await focusSettled();
    await user.type(screen.getByLabelText('Secret name'), 'TOKEN');
    await user.type(screen.getByLabelText('Value'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ projectId: 'project-1', name: 'TOKEN', value: 'abc' }),
    );
  });

  it('shows no "New secret" in the empty list to a person who may not create one', async () => {
    grant([Permission.LIST_SECRETS]);
    render(SecretPage, { projectId: 'project-1' });

    expect(within(await emptyState()).queryByRole('button')).not.toBeInTheDocument();
  });
});
