import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import WhatsNewDialog from './WhatsNewDialog.svelte';

const title = `What's new in Scylla ${WHATS_NEW.line}`;

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

  it('has one tab per version, the newest selected', async () => {
    render(WhatsNewDialog);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(tab => tab.textContent?.replace('New', '').trim())).toEqual([
      '0.7.3',
      '0.7.2',
      '0.7.1',
      '0.7.0',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('A new Projects page')).toBeInTheDocument();
    expect(screen.getByText('A new look')).not.toBeVisible();
  });

  it('scrolls the tab panel, not the dialog, so the tab list stays in view', async () => {
    render(WhatsNewDialog);

    const panel = (await screen.findAllByRole('tabpanel'))[0];
    expect(panel).toHaveClass('overflow-y-auto');
    expect(panel.closest('[data-slot="dialog-content"]')).toHaveClass('overflow-hidden');
  });

  it('shows the highlights of the tab that the user picks', async () => {
    render(WhatsNewDialog);

    await userEvent.click(await screen.findByRole('tab', { name: /^0.7.0/ }));

    expect(screen.getByText('A new look')).toBeVisible();
    expect(screen.queryByText('Sign-up mail')).not.toBeInTheDocument();
  });

  it('puts a dot on each tab at first, and keeps only the new tab for a user of 0.7.2', async () => {
    localStorage.setItem('whats-new-seen:0.7.2:release', '1');
    render(WhatsNewDialog);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map(tab => tab.textContent?.includes('New'))).toEqual([true, false, false, false]);
  });

  it('shows a dot on every tab for a new user', async () => {
    render(WhatsNewDialog);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.every(tab => tab.textContent?.includes('New'))).toBe(true);
  });

  it('shows again for a user who dismissed the 0.7.0 dialog', async () => {
    localStorage.setItem('whats-new-seen:0.7.0:release', '1');
    render(WhatsNewDialog);

    expect(await screen.findByText(title)).toBeInTheDocument();
  });
});
