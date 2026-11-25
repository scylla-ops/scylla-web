import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findTooltip, render } from '@test/render.ts';
import ShareLinkButton from './ShareLinkButton.svelte';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const HINT = 'Only members of Acme with access can open it.';
const matchMedia = window.matchMedia;
let writeText: ReturnType<typeof vi.fn>;

const withClipboard = (write: (text: string) => Promise<void>) => {
  writeText = vi.fn(write);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
};

/** A phone: a coarse pointer, and the share sheet of the system. */
const onPhone = (share: (data: ShareData) => Promise<void>) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const spy = vi.fn(share);
  Object.defineProperty(navigator, 'share', { value: spy, configurable: true });
  return spy;
};

beforeEach(() => withClipboard(() => Promise.resolve()));

afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = matchMedia;
  Reflect.deleteProperty(navigator, 'share');
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('ShareLinkButton', () => {
  it('copies the address of the page, says who can open it, and keeps the focus', async () => {
    render(ShareLinkButton, { hint: HINT });
    const button = screen.getByRole('button', { name: 'Copy link' });

    await userEvent.click(button);

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(toastSuccess).toHaveBeenCalledWith('Link copied', { description: HINT });
    expect(button).toHaveAttribute('data-done', 'true');
    expect(button).toHaveFocus();
  });

  it('copies the link that the page gives in place of its address', async () => {
    render(ShareLinkButton, { url: () => 'https://scylla.test/acme/dashboards/dash-7' });

    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith('https://scylla.test/acme/dashboards/dash-7');
    expect(toastSuccess).toHaveBeenCalledWith('Link copied');
  });

  it('shows the check for two seconds, then the link again', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    withClipboard(() => Promise.resolve());
    render(ShareLinkButton);
    const button = screen.getByRole('button', { name: 'Copy link' });

    await user.click(button);
    expect(button).toHaveAttribute('data-done', 'true');

    await vi.advanceTimersByTimeAsync(2000);

    expect(button).not.toHaveAttribute('data-done');
  });

  it('says why nothing was copied, and how to copy the link by hand', async () => {
    withClipboard(() => Promise.reject(new Error('denied')));
    render(ShareLinkButton, { hint: HINT });
    const button = screen.getByRole('button', { name: 'Copy link' });

    await userEvent.click(button);

    expect(toastError).toHaveBeenCalledWith(
      'The browser did not let the page write to the clipboard.',
      { description: 'Copy the address from the address bar.' },
    );
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('data-done');
  });

  it('opens the share sheet of the system on a phone, in place of a copy', async () => {
    const share = onPhone(() => Promise.resolve());
    render(ShareLinkButton, { url: () => 'https://scylla.test/acme/agents/app-1', hint: HINT });

    await userEvent.click(screen.getByRole('button', { name: 'Share link' }));

    expect(share).toHaveBeenCalledWith({
      title: document.title,
      url: 'https://scylla.test/acme/agents/app-1',
    });
    expect(toastSuccess).toHaveBeenCalledWith('Link shared', { description: HINT });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('says nothing when the person closes the share sheet', async () => {
    onPhone(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    render(ShareLinkButton, { hint: HINT });
    const button = screen.getByRole('button', { name: 'Share link' });

    await userEvent.click(button);

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute('data-done');
  });

  it('copies the link when the share sheet fails', async () => {
    onPhone(() => Promise.reject(new DOMException('No share', 'NotAllowedError')));
    render(ShareLinkButton, { hint: HINT });

    await userEvent.click(screen.getByRole('button', { name: 'Share link' }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(toastSuccess).toHaveBeenCalledWith('Link copied', { description: HINT });
  });

  it('copies on a computer that has the share sheet: only a touch screen shares', async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(ShareLinkButton);

    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalled();
  });

  it('has no button while the page gives no link', () => {
    render(ShareLinkButton, { url: () => null });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens its tooltip on hover, with its label', async () => {
    render(ShareLinkButton);

    await userEvent.hover(screen.getByRole('button', { name: 'Copy link' }));

    expect(await findTooltip()).toHaveTextContent('Copy link');
  });
});
