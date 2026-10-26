import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findTooltip, queryTooltip, render, textSnippet } from '@test/render.ts';
import GatedButton from './GatedButton.svelte';
import GatedButtonFixture from './GatedButton.fixture.svelte';

const denied = (onclick = vi.fn(), deniedReason?: string) => {
  render(GatedButton, { children: textSnippet('New app'), allowed: false, onclick, deniedReason });
  return screen.getByRole('button', { name: 'New app' });
};

describe('GatedButton', () => {
  it('is an ordinary button when the action is allowed', async () => {
    const onclick = vi.fn();
    render(GatedButton, { children: textSnippet('New app'), onclick });

    const button = screen.getByRole('button', { name: 'New app' });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-disabled');

    await userEvent.click(button);
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('keeps the disabled attribute of an allowed button', () => {
    render(GatedButton, { children: textSnippet('Save'), disabled: true });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('stays focusable when denied, marked aria-disabled rather than disabled', () => {
    const button = denied();

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toHaveAttribute('disabled');
  });

  it('runs nothing on a click, Enter or Space when denied', async () => {
    const onclick = vi.fn();
    const button = denied(onclick);

    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onclick).not.toHaveBeenCalled();
  });

  it('submits no form when denied', async () => {
    const onSubmit = vi.fn();
    render(GatedButtonFixture, { onSubmit });

    const save = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(save);
    save.focus();
    await userEvent.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gives the reason to a screen reader through aria-describedby', () => {
    const button = denied(vi.fn(), "You don't have permission to create apps.");

    const id = button.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(id)).toHaveTextContent(
      "You don't have permission to create apps.",
    );
  });

  it('shows the reason when the keyboard reaches it', async () => {
    denied(vi.fn(), "You don't have permission to create apps.");

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'New app' })).toHaveFocus();
    expect(await findTooltip()).toHaveTextContent("You don't have permission to create apps.");
  });

  it('explains the denial on hover', async () => {
    const button = denied(vi.fn(), "You don't have permission to create apps.");

    await userEvent.hover(button);

    expect(await findTooltip()).toHaveTextContent("You don't have permission to create apps.");
  });

  it('falls back to a generic reason when the caller gives none', async () => {
    const button = denied();

    await userEvent.hover(button);

    expect(await findTooltip()).toHaveTextContent("You don't have permission to do this.");
  });

  it('carries no tooltip at all when allowed and none was asked for', async () => {
    render(GatedButton, { children: textSnippet('New app') });

    await userEvent.hover(screen.getByRole('button', { name: 'New app' }));

    expect(queryTooltip()).toBeNull();
  });

  it('still shows a hover label when allowed, for an icon-only control', async () => {
    const onclick = vi.fn();
    render(GatedButton, { children: textSnippet('Delete'), tooltip: 'Delete', onclick });

    const button = screen.getByRole('button', { name: 'Delete' });
    await userEvent.click(button);
    expect(onclick).toHaveBeenCalledOnce();

    await userEvent.hover(button);
    expect(await findTooltip()).toHaveTextContent('Delete');
  });

  it('takes the focus back from the dialog that it opened, also when the dialog denies it', async () => {
    render(GatedButtonFixture, { onSubmit: vi.fn() });
    const add = screen.getByRole('button', { name: 'Add' });

    await userEvent.click(add);
    await userEvent.click(await screen.findByRole('button', { name: 'Do it' }));

    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(add).toHaveAttribute('aria-disabled', 'true');
    await vi.waitFor(() => expect(add).toHaveFocus());
  });
});
