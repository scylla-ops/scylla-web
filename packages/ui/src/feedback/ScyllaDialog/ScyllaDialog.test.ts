import { afterEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { dialogHoldStore } from '../../stores/index.ts';
import ScyllaDialog from './ScyllaDialog.fixture.svelte';

const closed = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.pointerEvents).toBe('');
  });

describe('ScyllaDialog', () => {
  afterEach(() => dialogHoldStore.setState({ held: false }));

  it('takes no Escape while the dialogs are held, and hides its close button', async () => {
    render(ScyllaDialog);
    dialogHoldStore.setState({ held: true });

    await userEvent.keyboard('{Escape}');

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.className).toContain('[&>button]:hidden'));
    expect(dialog.className).toContain('[&_[data-dialog-dismiss]]:hidden');
  });

  it('closes on Escape again once the hold ends', async () => {
    render(ScyllaDialog);
    dialogHoldStore.setState({ held: true });
    dialogHoldStore.setState({ held: false });

    await userEvent.keyboard('{Escape}');

    await closed();
  });

  it('gives its data attributes to the box of the dialog', () => {
    render(ScyllaDialog, { 'data-mark': 'here' });

    expect(screen.getByRole('dialog')).toHaveAttribute('data-mark', 'here');
  });

  it('closes on its close button', async () => {
    render(ScyllaDialog);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    await closed();
  });

  it('closes on Escape', async () => {
    render(ScyllaDialog);

    await userEvent.keyboard('{Escape}');

    await closed();
  });

  it('closes from a button of its content', async () => {
    render(ScyllaDialog);

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));

    await closed();
  });

  it('opens again after a close, with its content reset', async () => {
    render(ScyllaDialog);
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
    await userEvent.keyboard('{Escape}');
    await closed();

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(await screen.findByRole('textbox', { name: 'Email' })).toHaveValue('');
  });

  it('stays open on Escape when it is not dismissible', async () => {
    render(ScyllaDialog, { dismissible: false });

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes only on its close button when only the button may dismiss it', async () => {
    render(ScyllaDialog, { dismissible: 'button' });

    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    await closed();
  });
});
