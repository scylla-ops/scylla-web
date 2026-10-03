import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import LaunchOverlays from './LaunchOverlays.svelte';
import Tour from './Tour.fixture.svelte';

const loadOnboardingTour = vi.hoisted(() => vi.fn());
vi.mock('@base/features/onboarding', () => ({ loadOnboardingTour }));

const whatsNew = `What's new in Scylla ${WHATS_NEW.version}`;

beforeEach(() => {
  localStorage.clear();
  loadOnboardingTour.mockResolvedValue({ default: Tour });
});

describe('LaunchOverlays', () => {
  it('holds the onboarding tour back while the release announcement shows', async () => {
    render(LaunchOverlays);

    expect(await screen.findByText(whatsNew)).toBeInTheDocument();
    expect(loadOnboardingTour).not.toHaveBeenCalled();
    expect(screen.queryByText('tour')).not.toBeInTheDocument();
  });

  it('shows the tour once the announcement is dismissed', async () => {
    render(LaunchOverlays);
    await userEvent.click(await screen.findByRole('button', { name: 'Got it' }));

    expect(await screen.findByText('tour')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(whatsNew)).not.toBeInTheDocument());
  });

  it('shows the tour at once when the release was already seen', async () => {
    localStorage.setItem(`whats-new-seen:${WHATS_NEW.version}:release`, '1');
    render(LaunchOverlays);

    expect(await screen.findByText('tour')).toBeInTheDocument();
  });
});
