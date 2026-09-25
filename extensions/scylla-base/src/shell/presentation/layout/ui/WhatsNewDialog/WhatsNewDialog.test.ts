import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import WhatsNewDialog from './WhatsNewDialog.svelte';

const title = `What's new in Scylla ${WHATS_NEW.version}`;

beforeEach(() => localStorage.clear());

describe('WhatsNewDialog', () => {
  it('announces the release once, until the user dismisses it', async () => {
    render(WhatsNewDialog);

    expect(await screen.findByText(title)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }));

    await waitFor(() => expect(screen.queryByText(title)).not.toBeInTheDocument());
  });

  it('stays closed once the release is dismissed', () => {
    localStorage.setItem(`whats-new-seen:${WHATS_NEW.version}:release`, '1');
    render(WhatsNewDialog);

    expect(screen.queryByText(title)).not.toBeInTheDocument();
  });
});
