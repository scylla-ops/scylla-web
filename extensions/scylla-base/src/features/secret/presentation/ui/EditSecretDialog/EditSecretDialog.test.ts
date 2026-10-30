import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { focusSettled, render, withQueryClient, withRegistry } from '@test/render.ts';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { SecretEntity } from '@base/features/secret/domain/entities/secret.entity.ts';
import type { SecretUsage } from '@base/features/secret/domain/structs/secret-usage.struct.ts';
import EditSecretDialog from './EditSecretDialog.svelte';

vi.mock('svelte-sonner', () => ({ toast: { success: vi.fn() } }));

const secret: SecretEntity = {
  id: 'secret-1',
  projectId: 'project-1',
  name: 'DATABASE_URL',
  description: 'prod db',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const usage = (names: string[], totalCount = names.length): SecretUsage => ({
  pipelines: names.map(name => ({ id: `id-${name}`, name })),
  totalCount,
});

let teardown: Array<() => void> = [];
let update: ReturnType<typeof vi.fn>;
let listPipelines: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn<() => void>>;

const setUp = (using = usage(['build', 'deploy'], 5)) => {
  update = vi.fn().mockResolvedValue(secret);
  listPipelines = vi.fn().mockResolvedValue(using);
  onClose = vi.fn<() => void>();
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      secret: { secretRepository: { update, listPipelinesUsing: listPipelines } },
    }),
  ];
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });

  return render(EditSecretDialog, { secret, projectId: 'project-1', onClose });
};

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('EditSecretDialog', () => {
  it('starts from the description and never shows the value', async () => {
    setUp();
    await focusSettled();

    expect(screen.getByLabelText('Description')).toHaveValue('prod db');
    expect(screen.getByLabelText('New value')).toHaveValue('');
  });

  it('saves a description change at once, with no warning', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'staging db');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ secretId: 'secret-1', description: 'staging db' }),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(listPipelines).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('warns before it replaces a value, with the pipelines that use the secret', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    await user.type(screen.getByLabelText('New value'), 'postgres://new');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const warning = await screen.findByRole('alertdialog');
    expect(warning).toHaveTextContent('Replace the value of DATABASE_URL?');
    expect(warning).toHaveTextContent('The current value is lost. You cannot recover it.');
    expect(warning).toHaveTextContent('Running jobs keep the old value.');
    const list = await screen.findByRole('list', { name: 'Pipelines that use this secret' });
    expect(list).toHaveTextContent('build');
    expect(list).toHaveTextContent('deploy');
    expect(warning).toHaveTextContent('and 3 more');
    expect(listPipelines).toHaveBeenCalledWith('project-1', 'DATABASE_URL');
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Replace value' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        secretId: 'secret-1',
        description: 'prod db',
        value: 'postgres://new',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('says so when no pipeline uses the secret', async () => {
    const user = userEvent.setup();
    setUp(usage([]));
    await focusSettled();

    await user.type(screen.getByLabelText('New value'), 'new');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('No pipeline uses this secret')).toBeInTheDocument();
  });

  it('sends nothing when the warning is cancelled', async () => {
    const user = userEvent.setup();
    setUp();
    await focusSettled();

    await user.type(screen.getByLabelText('New value'), 'new');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(update).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('lists no pipeline without LIST_PIPELINES_BY_PROJECT, and still warns', async () => {
    const user = userEvent.setup();
    setUp();
    permissionsStore.setState({ permissions: { scopes: [] } });
    await focusSettled();

    await user.type(screen.getByLabelText('New value'), 'new');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Replace the value');
    expect(screen.getByText('You cannot see which pipelines use this secret.')).toBeInTheDocument();
    expect(listPipelines).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says so when the pipelines that use the secret cannot be loaded, and still warns', async () => {
    const user = userEvent.setup();
    setUp();
    listPipelines.mockRejectedValue(new ScyllaError('boom'));
    await focusSettled();

    await user.type(screen.getByLabelText('New value'), 'new');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Could not load the pipelines that use this secret.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace value' })).toBeEnabled();
  });
});
