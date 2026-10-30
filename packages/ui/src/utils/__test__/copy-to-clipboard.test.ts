import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from '../copy-to-clipboard.ts';

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const withClipboard = (writeText: (text: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

afterEach(() => {
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe('copyToClipboard', () => {
  it('writes the text and says it was copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    withClipboard(writeText);

    await copyToClipboard('make test');

    expect(writeText).toHaveBeenCalledWith('make test');
    expect(toastSuccess).toHaveBeenCalledWith('Copied to the clipboard.');
  });

  it('says why nothing was copied when the browser refuses', async () => {
    withClipboard(() => Promise.reject(new Error('denied')));

    await copyToClipboard('make test');

    expect(toastError).toHaveBeenCalledWith(
      'The browser did not let the page write to the clipboard.',
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('says it with the texts of the caller, and tells whether it copied', async () => {
    withClipboard(() => Promise.resolve());
    expect(await copyToClipboard('id', { copied: 'ID copied', failed: 'No copy' })).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith('ID copied');

    withClipboard(() => Promise.reject(new Error('denied')));
    expect(await copyToClipboard('id', { copied: 'ID copied', failed: 'No copy' })).toBe(false);
    expect(toastError).toHaveBeenCalledWith('No copy');
  });
});
