import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import ConfirmOperationAlertDialog from './ConfirmOperationAlertDialog.svelte';

const props = { open: true, onOpenChange: vi.fn(), onContinue: vi.fn() };

describe('ConfirmOperationAlertDialog', () => {
  it('confirms with a destructive button: it confirms an action that takes something away', async () => {
    render(ConfirmOperationAlertDialog, { ...props, continueLabel: 'Delete' });

    const confirm = await screen.findByRole('button', { name: 'Delete' });
    expect(confirm).toHaveAttribute('data-variant', 'destructive');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
      'data-variant',
      'outline',
    );
  });

  it('confirms with the default button when the action takes nothing away', async () => {
    render(ConfirmOperationAlertDialog, {
      ...props,
      continueLabel: 'Reactivate',
      variant: 'default',
    });

    expect(await screen.findByRole('button', { name: 'Reactivate' })).toHaveAttribute(
      'data-variant',
      'default',
    );
  });
});
