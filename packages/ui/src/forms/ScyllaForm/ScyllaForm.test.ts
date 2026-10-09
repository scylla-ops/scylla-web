import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render } from '@test/render.svelte.ts';
// The fixture pins the id generic.
import ScyllaForm from './ScyllaForm.props.fixture.svelte';
import ScyllaFormFixture from './ScyllaForm.fixture.svelte';
import ScyllaFormSelectFixture from './ScyllaFormSelect.fixture.svelte';
import { items } from './form.fixture.ts';
import { FormItemType } from '../scylla-form.struct.ts';

describe('ScyllaForm', () => {
  it('renders a label and an input for each item', () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save' });

    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('disables the submit button while a required field is empty', () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save' });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('enables the submit button once the required field is filled', async () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save' });

    await userEvent.type(screen.getByLabelText('Username'), 'ravenne');

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('submits the current values, keyed by item id', async () => {
    const onSubmit = vi.fn();
    render(ScyllaForm, { items, onSubmit, buttonLabel: 'Save' });

    await userEvent.type(screen.getByLabelText('Username'), 'ravenne');
    await userEvent.type(screen.getByLabelText('Bio'), 'builds things');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ username: 'ravenne', bio: 'builds things' });
  });

  it('submits with an optional field left empty', async () => {
    const onSubmit = vi.fn();
    render(ScyllaForm, { items, onSubmit, buttonLabel: 'Save' });

    await userEvent.type(screen.getByLabelText('Username'), 'ravenne');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ username: 'ravenne', bio: '' });
  });

  it('disables every field while isPending', () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save', isPending: true });

    expect(screen.getByLabelText('Username')).toBeDisabled();
    expect(screen.getByLabelText('Bio')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('autofocuses the first item only', () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save' });

    expect(screen.getByLabelText('Username')).toHaveFocus();
  });

  it('lets a footer snippet replace the default submit row, tracking isValid', async () => {
    render(ScyllaFormFixture);

    expect(screen.getByRole('button', { name: 'Incomplete' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Username'), 'ravenne');

    expect(screen.getByRole('button', { name: 'Ready' })).toBeEnabled();
  });

  it('passes isPending through to the footer snippet', () => {
    render(ScyllaFormFixture, { isPending: true });

    expect(screen.getByRole('button', { name: 'Incomplete' })).toBeDisabled();
  });

  it('leaves the checks to the app, never to the browser tooltip', () => {
    const { container } = render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save' });

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });

  it('gives each input its autocomplete value and its hint', () => {
    render(ScyllaForm, {
      items: [
        {
          id: 'username',
          type: FormItemType.Input,
          inputType: 'text',
          label: 'Username',
          autocomplete: 'username',
          description: 'A handle',
        },
        {
          id: 'bio',
          type: FormItemType.Input,
          inputType: 'text',
          label: 'Bio',
          optional: true,
          readonly: true,
        },
      ],
      onSubmit: vi.fn(),
      buttonLabel: 'Save',
    });

    const username = screen.getByLabelText('Username');
    expect(username).toHaveAttribute('autocomplete', 'username');
    expect(username).toHaveAccessibleDescription('A handle');
    expect(screen.getByLabelText('Bio')).toHaveAttribute('readonly');
  });

  it('shows the message of a wrong value when the field loses the focus', async () => {
    render(ScyllaForm, {
      items: [{ ...items[0], validate: () => ({ id: 'bad', message: 'Too short' }) }, items[1]],
      onSubmit: vi.fn(),
      buttonLabel: 'Save',
    });

    await userEvent.type(screen.getByLabelText('Username'), 'ra');
    expect(screen.queryByText('Too short')).not.toBeInTheDocument();

    await userEvent.tab();

    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('Too short');
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not submit while a value is wrong', async () => {
    const onSubmit = vi.fn();
    render(ScyllaForm, {
      items: [{ ...items[0], validate: () => ({ id: 'bad', message: 'Too short' }) }, items[1]],
      onSubmit,
      buttonLabel: 'Save',
    });

    await userEvent.type(screen.getByLabelText('Username'), 'ra');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('shows a message from the server under its field', () => {
    render(ScyllaForm, {
      items,
      onSubmit: vi.fn(),
      buttonLabel: 'Save',
      errors: { bio: 'Taken' },
    });

    expect(screen.getByLabelText('Bio')).toHaveAccessibleDescription('Taken');
  });

  it('does not take the focus when autofocus is off', () => {
    render(ScyllaForm, { items, onSubmit: vi.fn(), buttonLabel: 'Save', autofocus: false });

    expect(screen.getByLabelText('Username')).not.toHaveFocus();
  });

  it('renders a select as a combobox, and submits the option chosen', async () => {
    const onSubmit = vi.fn();
    render(ScyllaFormSelectFixture, { onSubmit });

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await findFloating('option', 'Pro'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ plan: 'pro' });
  });
});
