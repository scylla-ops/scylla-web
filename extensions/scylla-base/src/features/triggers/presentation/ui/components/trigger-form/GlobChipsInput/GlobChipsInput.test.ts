import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import GlobChipsInput from './GlobChipsInput.svelte';

const setup = (values: string[] = []) => {
  const onChange = vi.fn();
  render(GlobChipsInput, {
    id: 'branches',
    label: 'Branches to include',
    values,
    placeholder: 'Add a branch or a glob',
    hint: 'Empty: each branch.',
    onChange,
  });
  return { onChange, input: screen.getByLabelText('Branches to include') };
};

describe('GlobChipsInput', () => {
  it('adds the typed glob as a chip on Enter, trimmed', async () => {
    const { onChange, input } = setup(['main']);

    await userEvent.type(input, ' release/* {Enter}');

    expect(onChange).toHaveBeenCalledWith(['main', 'release/*']);
  });

  it('refuses a glob that is already in the list, and says why', async () => {
    const { onChange, input } = setup(['main']);

    await userEvent.type(input, 'main{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('This glob is already in the list.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes a chip with its own named control', async () => {
    const { onChange } = setup(['main', 'release/*']);

    await userEvent.click(screen.getByRole('button', { name: 'Remove release/*' }));

    expect(onChange).toHaveBeenCalledWith(['main']);
  });

  it('removes the last chip on Backspace in an empty field', async () => {
    const { onChange, input } = setup(['main', 'release/*']);

    await userEvent.type(input, '{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['main']);
  });

  it('tells what an empty list means', () => {
    setup();
    expect(screen.getByText('Empty: each branch.')).toBeInTheDocument();
  });
});
