import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import NodeEnvFields from './NodeEnvFields.svelte';

let teardown: Array<() => void> = [];

const setup = (secretRef: string, names: string[], permissions = [Permission.LIST_SECRETS]) => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.PROJECT,
          scopeId: 'p-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });
  const listByProjectId = vi
    .fn()
    .mockResolvedValue(names.map(name => ({ id: `id-${name}`, name })));
  const cache = withQueryClient();
  const restore = withRegistry({
    secret: {
      secretRepository: {
        listByProjectId,
      },
    },
  });
  teardown = [cache.restore, restore];
  const setEnv = vi.fn();
  const draft = {
    envRows: [{ key: 'TOKEN', kind: 'secret', value: '', secretRef }],
    setEnv,
    removeEnv: vi.fn(),
    addEnv: vi.fn(),
  };
  render(NodeEnvFields, { draft: draft as never, projectId: 'p-1' });
  return { setEnv, listByProjectId };
};

afterEach(() => {
  teardown.forEach(restore => restore());
  permissionsStore.setState({ permissions: null });
});

describe('NodeEnvFields', () => {
  it('finds a secret by its name', async () => {
    const { setEnv } = setup('', ['deploy-key', 'npm-token']);
    const field = await screen.findByRole('combobox', { name: 'Reference a secret' });

    await userEvent.type(field, 'npm');
    await findFloating('option', 'npm-token');
    expect(screen.queryAllByRole('option', { hidden: true })).toHaveLength(1);
    await userEvent.keyboard('{Enter}');

    expect(setEnv).toHaveBeenCalledWith(0, { secretRef: 'npm-token' });
  });

  it('keeps a reference to a secret that is not there', async () => {
    setup('gone', ['deploy-key']);
    const field = await screen.findByRole<HTMLInputElement>('combobox', {
      name: 'Reference a secret',
    });

    expect(field.value).toBe('gone');
    await userEvent.click(field);
    await findFloating('option', 'gone');
    await findFloating('option', 'deploy-key');
  });

  it('gives a free text field when there is no secret to choose', async () => {
    const { setEnv } = setup('', []);
    const field = await screen.findByRole('textbox', { name: 'Reference a secret' });

    await userEvent.type(field, 'X');

    expect(setEnv).toHaveBeenCalledWith(0, { secretRef: 'X' });
  });

  it('asks for no secret without LIST_SECRETS, and takes a typed name', async () => {
    const { setEnv, listByProjectId } = setup('', ['deploy-key'], []);
    const field = await screen.findByRole('textbox', { name: 'Reference a secret' });

    await userEvent.type(field, 'X');

    expect(setEnv).toHaveBeenCalledWith(0, { secretRef: 'X' });
    expect(listByProjectId).not.toHaveBeenCalled();
  });
});
