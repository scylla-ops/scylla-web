import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import NodeEnvFields from './NodeEnvFields.svelte';

let teardown: Array<() => void> = [];

const setup = (secretRef: string, names: string[]) => {
  const cache = withQueryClient();
  const restore = withRegistry({
    secret: {
      secretRepository: {
        listByProjectId: vi
          .fn()
          .mockResolvedValue(names.map(name => ({ id: `id-${name}`, name }))),
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
  return { setEnv };
};

afterEach(() => teardown.forEach(restore => restore()));

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
});
