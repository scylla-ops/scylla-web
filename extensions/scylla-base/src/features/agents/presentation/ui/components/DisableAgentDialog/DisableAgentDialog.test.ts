import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
import DisableAgentDialog from './DisableAgentDialog.svelte';

const agent = { id: 'agent-1', name: 'prelude-deployer' } as AgentEntity;

describe('DisableAgentDialog', () => {
  it('says what disabling does before it happens', async () => {
    render(DisableAgentDialog, { agent, onCancel: vi.fn(), onConfirm: vi.fn() });

    const dialog = within(await screen.findByRole('alertdialog'));
    expect(dialog.getByText('Disable prelude-deployer?')).toBeInTheDocument();
    expect(
      dialog.getByText('Jobs placed on it that have not started go back to the queue.'),
    ).toBeInTheDocument();
    expect(dialog.getByText('A job that runs now can end as orphaned.')).toBeInTheDocument();
    expect(
      dialog.getByText('Its secrets and grants stay. Enable it to restore them.'),
    ).toBeInTheDocument();
  });

  it('confirms with the destructive button, and cancels with the other', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(DisableAgentDialog, { agent, onCancel, onConfirm });
    const dialog = within(await screen.findByRole('alertdialog'));

    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(dialog.getByRole('button', { name: 'Disable agent' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('cannot be confirmed twice while the call runs', async () => {
    render(DisableAgentDialog, { agent, isPending: true, onCancel: vi.fn(), onConfirm: vi.fn() });

    const dialog = within(await screen.findByRole('alertdialog'));
    expect(dialog.getByRole('button', { name: 'Disable agent' })).toBeDisabled();
  });

  it('lays out a header, a body and a footer band on one edge, with no icon column', async () => {
    render(DisableAgentDialog, { agent, onCancel: vi.fn(), onConfirm: vi.fn() });

    const dialog = await screen.findByRole('alertdialog');
    const parts = [...dialog.querySelectorAll('[data-dialog-part]')];
    expect(parts.map(part => part.getAttribute('data-dialog-part'))).toEqual([
      'header',
      'body',
      'footer',
    ]);
    expect(parts[0].querySelector('svg')).toBeNull();
    expect(parts[0].firstElementChild).toHaveTextContent('Disable prelude-deployer?');
    expect(
      within(parts[2] as HTMLElement).getByRole('button', { name: 'Disable agent' }),
    ).toBeInTheDocument();
  });

  it('closes from its X like Cancel', async () => {
    const onCancel = vi.fn();
    render(DisableAgentDialog, { agent, onCancel, onConfirm: vi.fn() });

    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Close' }),
    );

    expect(onCancel).toHaveBeenCalled();
  });
});
