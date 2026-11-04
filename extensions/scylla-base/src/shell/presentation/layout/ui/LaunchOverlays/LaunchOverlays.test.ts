import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import LaunchOverlays from './LaunchOverlays.svelte';

const whatsNew = `What's new in Scylla ${WHATS_NEW.version}`;

beforeEach(() => localStorage.clear());

describe('LaunchOverlays', () => {
  it('shows the release announcement until it is dismissed', async () => {
    render(LaunchOverlays);
    await userEvent.click(await screen.findByRole('button', { name: 'Got it' }));

    await waitFor(() => expect(screen.queryByText(whatsNew)).not.toBeInTheDocument());
  });

  it('shows nothing when the release was already seen', () => {
    localStorage.setItem(`whats-new-seen:${WHATS_NEW.version}:release`, '1');
    render(LaunchOverlays);

    expect(screen.queryByText(whatsNew)).not.toBeInTheDocument();
  });
});
