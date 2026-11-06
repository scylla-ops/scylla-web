import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.ts';
import NodeDependencies from './NodeDependencies.svelte';

const setup = () => {
  const onChange = vi.fn();
  render(NodeDependencies, {
    deps: ['build'],
    candidates: ['build', 'lint', 'test-api', 'test-web'],
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
    expect(screen.getByRole('status')).toHaveTextContent('No match');
  });

  it('adds the node on Enter, then empties the field for the next one', async () => {
    const { field, onChange } = setup();

    await userEvent.type(field, 'lin{Enter}');

    expect(onChange).toHaveBeenCalledWith(['build', 'lint']);
    expect(field.value).toBe('');
  });
});
