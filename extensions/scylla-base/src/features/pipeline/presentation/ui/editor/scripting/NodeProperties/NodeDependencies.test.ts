import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import NodeDependencies from './NodeDependencies.svelte';

const setup = () => {
  const onChange = vi.fn();
  render(NodeDependencies, {
    deps: [{ node: 'build' }],
    candidates: [
      { node: 'build' },
      { node: 'lint' },
      { node: 'test-api' },
      { node: 'test-web' },
      { node: 'is-main', port: 'true' },
      { node: 'build', port: 'error' },
    ],
    dependents: [],
    onChange,
    onOpen: vi.fn(),
  });
  return {
    onChange,
    field: screen.getByRole<HTMLInputElement>('combobox', { name: 'Add a dependency' }),
  };
};

describe('NodeDependencies', () => {
  it('finds a node by a part of its id, and does not offer one that it already waits for', async () => {
    const { field } = setup();

    await userEvent.type(field, 'web');
    await findFloating('option', 'test-web');
    expect(screen.queryAllByRole('option', { hidden: true })).toHaveLength(1);

    await userEvent.clear(field);
    await userEvent.type(field, 'build');
    await findFloating('option', 'build:error');
    expect(screen.queryAllByRole('option', { hidden: true })).toHaveLength(1);
  });

  it('adds the node on Enter, then empties the field for the next one', async () => {
    const { field, onChange } = setup();

    await userEvent.type(field, 'lin{Enter}');

    expect(onChange).toHaveBeenCalledWith([{ node: 'build' }, { node: 'lint' }]);
    expect(field.value).toBe('');
  });

  it('offers a port of a switch and the error output of a node, as a need with that port', async () => {
    const { field, onChange } = setup();

    await userEvent.type(field, 'is-main');
    await findFloating('option', 'is-main:true');
    await userEvent.keyboard('{Enter}');
    await userEvent.type(field, 'build:');
    await findFloating('option', 'build:error');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith([{ node: 'build' }, { node: 'is-main', port: 'true' }]);
    expect(onChange).toHaveBeenLastCalledWith([{ node: 'build' }, { node: 'build', port: 'error' }]);
  });
});
