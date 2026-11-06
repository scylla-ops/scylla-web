import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getQueryClient } from '@scylla/core-sdk';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';
import { reportQueryError } from '../report-query-error.ts';

const toastError = vi.fn();
const toastWarning = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: {
    error: (message: string) => toastError(message),
    warning: (message: string) => toastWarning(message),
  },
}));

const close = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@platform/grpc', () => ({ browserSession: { close } }));

const errorWith = (code: ScyllaErrorCode) => new ScyllaError('boom', { code });
let location: Location;

const at = (pathname: string, hash = '', search = '') =>
  Object.defineProperty(window, 'location', {
    value: { href: pathname + search + hash, pathname, search, hash },
    configurable: true,
  });

/** The return path of a `/login#next=…` address, or `null`. */
const returnPathOf = (href: string) =>
  new URLSearchParams(href.slice(href.indexOf('#') + 1)).get('next');

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('userId', 'user-1');
  location = window.location;
  at('/acme');
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: location, configurable: true });
  vi.restoreAllMocks();
});

describe('reportQueryError', () => {
  it('shows no new toast for a repeated failure, but still ends a lost session', () => {
    reportQueryError(errorWith('INTERNAL'), 'query', { repeated: true });
    expect(toastError).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();

    reportQueryError(errorWith('UNAUTHENTICATED'), 'query', { repeated: true });
    expect(returnPathOf(window.location.href)).toBe('/acme');
  });

  it('leaves an error to the page that shows it, but still ends a lost session', () => {
    at('/acme/members', '', '');

    reportQueryError(errorWith('UNAVAILABLE'), 'query', { showsOwnError: true });
    expect(close).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    reportQueryError(errorWith('UNAUTHENTICATED'), 'query', { showsOwnError: true });
    expect(close).toHaveBeenCalledOnce();
  });

  it('signs out when the backend no longer knows the user, and comes back after the sign-in', () => {
    at('/acme/members', '', '?tab=roles');

    reportQueryError(errorWith('UNAUTHENTICATED'), 'mutation');

    expect(close).toHaveBeenCalledOnce();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(window.location.href.startsWith('/login#')).toBe(true);
    expect(returnPathOf(window.location.href)).toBe('/acme/members?tab=roles');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('keeps the fragment of a public page, and its token, in the fragment of the login page', () => {
    at('/invite', '#token=abc-_123');

    reportQueryError(errorWith('UNAUTHENTICATED'), 'query');

    const href = window.location.href;
    expect(href).not.toContain('?');
    expect(href.slice(0, href.indexOf('#'))).toBe('/login');
    expect(returnPathOf(href)).toBe('/invite#token=abc-_123');
  });

  it('goes to the plain login page from the login page, so that it does not loop', () => {
    at('/login', '#next=%2Finvite%23token%3Dabc');

    reportQueryError(errorWith('UNAUTHENTICATED'), 'query');

    expect(window.location.href).toBe('/login');
  });

  it('goes to the plain login page when the current path is not a path of this app', () => {
    at('//evil.example/x');

    reportQueryError(errorWith('UNAUTHENTICATED'), 'query');

    expect(window.location.href).toBe('/login');
  });

  it('keeps the user signed in and on the page when a query cannot reach the server', () => {
    at('/acme/members');

    reportQueryError(errorWith('UNAVAILABLE'), 'query');

    expect(close).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/acme/members');
    expect(localStorage.getItem('userId')).toBe('user-1');
    expect(toastError).toHaveBeenCalledOnce();
  });

  it('keeps the user signed in when a mutation cannot reach it, so that they can retry', () => {
    reportQueryError(errorWith('UNAVAILABLE'), 'mutation');

    expect(close).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
  });

  it('shows a mutation refused because the item changed as a conflict, and reloads the screen', () => {
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries').mockResolvedValue();

    reportQueryError(errorWith('ABORTED'), 'mutation');

    expect(toastWarning).toHaveBeenCalledWith(
      'Someone else changed this item in the meantime. The page now shows the latest version.',
    );
    expect(toastError).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith();
    expect(localStorage.getItem('userId')).toBe('user-1');
  });

  it('does not reload the screen for a query that the server aborted', () => {
    const invalidate = vi.spyOn(getQueryClient(), 'invalidateQueries').mockResolvedValue();

    reportQueryError(errorWith('ABORTED'), 'query');

    expect(toastWarning).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledOnce();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('toasts the message of any other Scylla error', () => {
    reportQueryError(errorWith('NOT_FOUND'), 'query');

    expect(toastError).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });

  it('gives an error that does not come from Scylla the generic message, not its own text', () => {
    reportQueryError(new TypeError('x is undefined'), 'query');

    expect(toastError).toHaveBeenCalledWith('An unexpected error occurred');
    expect(console.error).toHaveBeenCalled();
  });
});
