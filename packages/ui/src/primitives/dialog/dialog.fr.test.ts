import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { messages } from '../../locales/fr/messages.ts';
import { render } from '@test/render.svelte.ts';
import { withLocale } from '@test/i18n.ts';
import DialogFixture from './dialog.fixture.svelte';

withLocale('fr', messages);

describe('Dialog in French', () => {
  it('names its close button in French, so a screen reader does not say "Close"', async () => {
    render(DialogFixture);

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
