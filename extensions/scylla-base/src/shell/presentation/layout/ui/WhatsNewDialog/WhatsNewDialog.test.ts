import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, act, fireEvent, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import type * as PlatformContext from '@platform/context';
import { contextStore } from '@platform/context';
import { WHATS_NEW } from '@base/shell/whats-new.ts';
import { commandBarRequests } from '@base/shell/presentation/layout/command-bar-request.state.svelte.ts';
import WhatsNewDialog from './WhatsNewDialog.svelte';

const navigate = vi.hoisted(() => ({ goToWorkspaceRoute: vi.fn() }));
vi.mock('@platform/context', async importOriginal => ({
  ...(await importOriginal<typeof PlatformContext>()),
  scyllaNavigate: navigate,
}));
const startTour = vi.hoisted(() => vi.fn());
vi.mock('@base/features/onboarding', () => ({ startTourById: startTour }));

const grant = (permissions: Permission[]) => {
  permissionsStore.setState({
    permissions: {
      scopes: [
        {
          scope: PermissionScope.WORKSPACE,
          scopeId: 'ws-1',
          access: { kind: 'restricted', permissions },
        },
      ],
    },
  });
  contextStore.setState({ workspace: { id: 'ws-1', name: 'acme', slug: 'acme' } });
};

const title = `What's new in Scylla ${WHATS_NEW.line}`;

beforeEach(() => {
  localStorage.clear();
  navigate.goToWorkspaceRoute.mockClear();
  startTour.mockClear();
});
afterEach(() => permissionsStore.setState({ permissions: null }));

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

  it('shows the main features of 0.7.3 in its tab, in order', async () => {
    render(WhatsNewDialog);

    const panel = (await screen.findAllByRole('tabpanel'))[0];
    const titles = within(panel)
      .getAllByRole('heading', { level: 4 })
      .map(heading => heading.textContent);
    expect(titles).toEqual([
      'A new Projects page',
      'Make it yours',
      'Ctrl K finds even more',
      'A smoother interface',
    ]);
    expect(within(panel).queryByText('A clearer command bar')).not.toBeInTheDocument();
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

describe('WhatsNewDialog targets', () => {
  it('opens the page of an item, closes the dialog and marks the item seen', async () => {
    grant([Permission.READ_WORKSPACE]);
    render(WhatsNewDialog);

    await userEvent.click(await screen.findByRole('button', { name: /A new Projects page/ }));

    expect(navigate.goToWorkspaceRoute).toHaveBeenCalledWith('projects');
    await waitFor(() => expect(screen.queryByText(title)).not.toBeInTheDocument());
    expect(localStorage.getItem('whats-new-seen:0.7.3:projects-page')).toBe('1');
  });

  it('opens an item with the keyboard', async () => {
    grant([Permission.READ_WORKSPACE]);
    render(WhatsNewDialog);

    const item = await screen.findByRole('button', { name: /A new Projects page/ });
    item.focus();
    await userEvent.keyboard('{Enter}');

    expect(navigate.goToWorkspaceRoute).toHaveBeenCalledWith('projects');
  });

  it('opens the command bar for an action item after the dialog left', async () => {
    render(WhatsNewDialog);
    const before = commandBarRequests();

    await userEvent.click(await screen.findByRole('button', { name: /Ctrl K finds even more/ }));

    await waitFor(() => expect(commandBarRequests()).toBe(before + 1));
  });

  it('starts the search tour from the command bar item of 0.7.2', async () => {
    render(WhatsNewDialog);

    await userEvent.click(await screen.findByRole('tab', { name: /^0.7.2/ }));
    await userEvent.click(screen.getByRole('button', { name: /A clearer command bar/ }));

    await waitFor(() => expect(startTour).toHaveBeenCalledWith('search'));
  });

  it('does not make a clickable item of a page that the user cannot open', async () => {
    grant([]);
    render(WhatsNewDialog);

    await screen.findAllByRole('tab');
    expect(screen.getByText('A new Projects page')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /A new Projects page/ })).not.toBeInTheDocument();
  });

  it('does not make a clickable item of a highlight with no target', async () => {
    render(WhatsNewDialog);

    await screen.findAllByRole('tab');
    expect(screen.queryByRole('button', { name: /A smoother interface/ })).not.toBeInTheDocument();
  });

  it('stops the autoplay when an item is opened', async () => {
    render(WhatsNewDialog);
    await userEvent.click(await screen.findByRole('button', { name: /Ctrl K finds even more/ }));

    expect(screen.queryByTestId('whats-new-progress')).not.toBeInTheDocument();
  });

  it('gives each target to an item that can be opened, and none to the others', () => {
    const withTarget = WHATS_NEW.highlights.filter(highlight => highlight.target);
    expect(withTarget.length).toBeGreaterThan(8);
    for (const highlight of WHATS_NEW.highlights.filter(item => item.navUrl)) {
      expect(highlight.target).toMatchObject({ kind: 'page', url: highlight.navUrl });
    }
  });
});

describe('WhatsNewDialog autoplay', () => {
  const selected = () =>
    screen
      .getAllByRole('tab')
      .find(tab => tab.getAttribute('aria-selected') === 'true')
      ?.textContent?.replace('New', '')
      .trim();
  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const setReduced = (matches: boolean) =>
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    setReduced(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('moves to the next tab by itself and loops back after the last one', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    expect(selected()).toBe('0.7.3');

    const seen = [selected()];
    for (let i = 0; i < 1000 && seen.length < 6; i += 1) {
      await advance(50);
      if (selected() !== seen[seen.length - 1]) seen.push(selected());
    }
    expect(seen).toEqual(['0.7.3', '0.7.2', '0.7.1', '0.7.0', '0.7.3', '0.7.2']);
  });

  it('fills the progress bar while it plays', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await advance(3000);

    const bar = screen.getByTestId('whats-new-progress');
    expect(bar.style.transform).not.toBe('scaleX(0)');
  });

  it('pauses on user input and resumes after 1.8 s without input', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await advance(2000);
    const before = screen.getByTestId('whats-new-progress').style.transform;

    await fireEvent.pointerMove(screen.getByRole('dialog'));
    await advance(1000);
    expect(screen.getByTestId('whats-new-progress').style.transform).toBe(before);

    await advance(2000);
    expect(screen.getByTestId('whats-new-progress').style.transform).not.toBe(before);
  });

  it('waits while an item of the list has the focus', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await act(() => screen.getByRole('button', { name: /Ctrl K finds even more/ }).focus());
    await advance(30000);
    expect(selected()).toBe('0.7.3');
  });

  it('pauses with the button and plays again', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await userEvent.click(screen.getByRole('button', { name: 'Pause the tour' }));
    await advance(30000);
    expect(selected()).toBe('0.7.3');

    await userEvent.click(screen.getByRole('button', { name: 'Resume the tour' }));
    await advance(2000 + 8000);
    expect(selected()).toBe('0.7.2');
  });

  it('restarts the bar when the user picks a tab', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await advance(3000);
    await userEvent.click(screen.getByRole('tab', { name: /^0.7.1/ }));

    expect(selected()).toBe('0.7.1');
    expect(screen.getByTestId('whats-new-progress')).toHaveStyle({ transform: 'scaleX(0)' });
  });

  it('pauses while the document is hidden', async () => {
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    await advance(40000);
    expect(selected()).toBe('0.7.3');
  });

  it('does not play with reduced motion', async () => {
    setReduced(true);
    render(WhatsNewDialog);
    await screen.findAllByRole('tab');
    await advance(40000);

    expect(selected()).toBe('0.7.3');
    expect(screen.queryByRole('button', { name: 'Pause the tour' })).not.toBeInTheDocument();
  });

  it('scrolls the panel only when the content overflows', async () => {
    render(WhatsNewDialog);
    const panel = (await screen.findAllByRole('tabpanel'))[0];
    Object.defineProperty(panel, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(panel, 'clientHeight', { value: 100, configurable: true });
    await advance(5000);
    expect(panel.scrollTop).toBe(0);

    Object.defineProperty(panel, 'scrollHeight', { value: 1000, configurable: true });
    await advance(5000);
    expect(panel.scrollTop).toBeGreaterThan(0);
  });
});
