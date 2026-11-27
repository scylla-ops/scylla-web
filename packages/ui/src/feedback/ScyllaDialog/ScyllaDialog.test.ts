import { afterEach, describe, it, expect, vi } from 'vitest';
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

  it('keeps its top edge at one place, whatever its height, when it is stable', () => {
    render(ScyllaDialog, { stable: 37 });

    const { className } = screen.getByRole('dialog');
    expect(className).toContain('translate-y-0');
    expect(className).not.toContain('translate-y-[-50%]');
    const { top, minHeight } = screen.getByRole('dialog').style;
    expect(top).toContain('18.5rem');
    expect(minHeight).toContain('37rem');
  });

  it('is a column that pushes its footer to the bottom when it is stable', () => {
    render(ScyllaDialog, { stable: 37 });

    const { className } = screen.getByRole('dialog');
    expect(className).toContain('flex-col');
    expect(className).toContain('[&_[data-slot=dialog-footer]]:mt-auto');
  });

  it('takes no Escape while the dialogs are held, and hides its close button', async () => {
    render(ScyllaDialog);
    dialogHoldStore.setState({ held: true });

    await userEvent.keyboard('{Escape}');

    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.className).toContain('[&>button]:hidden'));
    expect(dialog.className).toContain('[&_[data-dialog-dismiss]]:hidden');
  });

  it('tells the holder when an Escape is refused', async () => {
    const onBlocked = vi.fn();
    render(ScyllaDialog);
    dialogHoldStore.setState({ held: true, onBlocked });

    await userEvent.keyboard('{Escape}');

    expect(onBlocked).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    dialogHoldStore.setState({ held: false, onBlocked: undefined });
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
