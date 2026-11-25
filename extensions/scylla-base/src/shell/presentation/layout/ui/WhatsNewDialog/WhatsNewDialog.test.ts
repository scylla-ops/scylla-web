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

  it('shows the new highlights first, then the 0.7.0 ones', async () => {
    render(WhatsNewDialog);

    const news = await screen.findByText('New in 0.7.1 and 0.7.2');
    const old = screen.getByText('0.7.0');
    expect(news.compareDocumentPosition(old) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const first = screen.getByText('Scylla pipelines and file pipelines together');
    const last = screen.getByText('A new look');
    expect(news.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(old.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(first.compareDocumentPosition(old) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows again for a user who dismissed the 0.7.0 dialog', async () => {
    localStorage.setItem('whats-new-seen:0.7.0:release', '1');
    render(WhatsNewDialog);

    expect(await screen.findByText(title)).toBeInTheDocument();
  });
});
