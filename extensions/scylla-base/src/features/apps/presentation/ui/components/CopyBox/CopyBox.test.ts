import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import CopyBox from './CopyBox.svelte';

const SECRET = '7f3a9c0e5b2d4f6a8c1e3b5d7f9a2c4e6b8d0f1a3c5e7b9d2f4a6c8e0b1d3f5a';
const BULLETS = '•'.repeat(SECRET.length);
const COMMAND = [
  'docker run -d --restart unless-stopped \\',
  '  --control-plane-url https://scylla.example.com:8443 \\',
  `  --app-secret ${SECRET}`,
].join('\n');

const valueBox = () => {
  const pre = document.querySelector('pre');
  if (!pre) throw new Error('no value');
  return pre;
};

const visibleText = () => {
  const copy = valueBox().cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.sr-only').forEach(node => node.remove());
  return copy.textContent;
};

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => vi.restoreAllMocks());

describe('CopyBox', () => {
  it('wraps a long value inside its box', () => {
    render(CopyBox, { value: SECRET, copyToast: 'Copied' });

    expect(valueBox()).toHaveTextContent(SECRET);
    expect(valueBox()).toHaveClass('break-all', 'whitespace-pre-wrap');
  });

  it('keeps each line whole and scrolls it inside the box, which adds no width to its parents', () => {
    render(CopyBox, { value: COMMAND, copyToast: 'Copied', layout: 'lines' });

    expect(valueBox().textContent).toBe(COMMAND);
    expect(valueBox()).toHaveClass('overflow-x-auto', 'whitespace-pre', 'contain-inline-size');
  });

  it('keeps the copy button out of the scrolled value, so it stays on screen', () => {
    render(CopyBox, { value: COMMAND, copyToast: 'Copied', layout: 'lines', caption: 'Run it' });

    expect(valueBox().contains(screen.getByRole('button', { name: 'Copy' }))).toBe(false);
  });

  it('focuses the copy button on mount without a scroll, only when asked', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(CopyBox, { value: SECRET, copyToast: 'Copied' });
    expect(focus).not.toHaveBeenCalled();

    render(CopyBox, { value: SECRET, copyToast: 'Copied', focusOnMount: true });

    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: 'Copy' })[1]);
  });

  it('shows no mask and no eye button without a secret', () => {
    render(CopyBox, { value: COMMAND, copyToast: 'Copied', layout: 'lines' });

    expect(valueBox().textContent).toBe(COMMAND);
    expect(screen.queryByRole('button', { name: 'Show the secret' })).not.toBeInTheDocument();
  });
});

describe('CopyBox with a secret', () => {
  it('masks it by default: one bullet per character, and the real value nowhere in the DOM', () => {
    render(CopyBox, { value: SECRET, secret: SECRET, copyToast: 'Copied' });

    expect(visibleText()).toBe(BULLETS);
    expect(document.body.innerHTML).not.toContain(SECRET);
    expect(screen.getByRole('button', { name: 'Show the secret' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('gives a screen reader a name for the masked part, not the bullets', () => {
    render(CopyBox, { value: SECRET, secret: SECRET, copyToast: 'Copied' });

    expect(screen.getByText(BULLETS)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Hidden secret')).toHaveClass('sr-only');
  });

  it('shows and hides it with one eye button: the name stays, aria-pressed gives the state', async () => {
    render(CopyBox, { value: SECRET, secret: SECRET, copyToast: 'Copied' });
    const eye = screen.getByRole('button', { name: 'Show the secret' });

    await fireEvent.click(eye);

    expect(valueBox().textContent).toBe(SECRET);
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    expect(eye).toHaveAccessibleName('Show the secret');

    await fireEvent.click(eye);

    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(visibleText()).toBe(BULLETS);
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('copies the real value while it is masked', async () => {
    render(CopyBox, { value: SECRET, secret: SECRET, copyToast: 'Copied' });

    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(SECRET);
    expect(visibleText()).toBe(BULLETS);
  });

  it('masks only the secret in a longer value, and copies the whole value', async () => {
    render(CopyBox, {
      value: COMMAND,
      secret: SECRET,
      toggle: false,
      copyToast: 'Copied',
      layout: 'lines',
    });

    expect(visibleText()).toBe(COMMAND.replace(SECRET, BULLETS));
    expect(screen.queryByRole('button', { name: 'Show the secret' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(COMMAND);
  });

  it('follows a state that another box drives', async () => {
    const { rerender } = render(CopyBox, {
      value: COMMAND,
      secret: SECRET,
      toggle: false,
      copyToast: 'Copied',
    });

    await rerender({ revealed: true });
    expect(valueBox().textContent).toBe(COMMAND);

    await rerender({ revealed: false });
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('masks the whole value when it does not hold the secret as it is', () => {
    render(CopyBox, { value: `SECRET: "a\\"b"`, secret: 'a"b', copyToast: 'Copied' });

    expect(visibleText()).toBe('•••');
  });

  it('puts the copy button first: the onboarding tour waits for a click on the first button', () => {
    render(CopyBox, { value: SECRET, secret: SECRET, copyToast: 'Copied' });

    expect(document.querySelector('button')).toBe(screen.getByRole('button', { name: 'Copy' }));
  });
});
