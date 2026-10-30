import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { selectionStore } from '@scylla/ui/stores';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import type { SecretEntity } from '@base/features/secret/domain/entities/secret.entity.ts';
import type {
  SecretRepository,
} from '@base/features/secret/domain/repository/secret.repository.ts';
import SecretList from './SecretList.svelte';

const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { success: (...args: unknown[]) => toastSuccess(...args) } }));

const secret = (overrides: Partial<SecretEntity> = {}): SecretEntity => ({
  id: 'secret-1',
  projectId: 'project-1',
  name: 'DATABASE_URL',
  description: 'prod db',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

let teardown: Array<() => void> = [];
let deleteById: ReturnType<typeof vi.fn>;

const setUp = (secrets: SecretEntity[] = [secret()]) => {
  deleteById = vi.fn().mockResolvedValue(undefined);
  const repository = {
    listByProjectId: vi.fn().mockResolvedValue(secrets),
    create: vi.fn(),
    update: vi.fn(),
    deleteById,
  } as unknown as SecretRepository;
  const cache = withQueryClient();
  teardown = [cache.restore, withRegistry({ secret: { secretRepository: repository } })];

  return render(SecretList, { secrets, projectId: 'project-1' });
};

beforeEach(() => {
  toastSuccess.mockClear();
  selectionStore.setState({ selectedIds: {} });
});

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

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

describe('SecretList', () => {
  it('shows a secret’s name and its copyable id, never a value', () => {
    setUp();

    expect(screen.getByText('DATABASE_URL')).toBeInTheDocument();
    expect(screen.getByText('secret-1')).toBeInTheDocument();
  });

  it('shows the description', () => {
    setUp([secret({ description: 'staging db' })]);

    expect(screen.getByText('staging db')).toBeInTheDocument();
  });

  it('formats the creation day', () => {
    setUp([secret({ createdAt: '2026-03-15T00:00:00.000Z' })]);

    expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/\S/);
  });

  it('selects a row when it is clicked', async () => {
    setUp();

    await userEvent.click(screen.getByText('DATABASE_URL'));

    expect(selectionStore.getState().selectedIds.secrets).toEqual(['secret-1']);
  });

  it('asks for confirmation before deleting, without selecting the row', async () => {
    setUp();

    await userEvent.click(screen.getByRole('button', { name: 'Delete secret' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(deleteById).not.toHaveBeenCalled();
    expect(selectionStore.getState().selectedIds.secrets ?? []).toEqual([]);
  });

  it('deletes and reports it once the confirmation is accepted', async () => {
    setUp([secret({ id: 'secret-42' })]);

    await userEvent.click(screen.getByRole('button', { name: 'Delete secret' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(deleteById).toHaveBeenCalledWith('secret-42'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it('renders the empty state when the project has no secret', () => {
    setUp([]);

    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('offers an edit action only with UPDATE_SECRET', () => {
    grant([Permission.LIST_SECRETS]);
    const { unmount } = setUp();
    expect(screen.queryByRole('button', { name: 'Edit secret' })).not.toBeInTheDocument();
    unmount();

    grant([Permission.LIST_SECRETS, Permission.UPDATE_SECRET]);
    setUp();
    expect(screen.getByRole('button', { name: 'Edit secret' })).toBeInTheDocument();
  });

  it('opens the edit dialog on the secret, without selecting the row', async () => {
    grant([Permission.UPDATE_SECRET]);
    setUp();

    await userEvent.click(screen.getByRole('button', { name: 'Edit secret' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Edit secret DATABASE_URL');
    expect(selectionStore.getState().selectedIds.secrets ?? []).toEqual([]);
  });
});
