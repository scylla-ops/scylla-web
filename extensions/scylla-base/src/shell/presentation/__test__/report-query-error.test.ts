import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';
import { reportQueryError } from '../report-query-error.ts';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

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
  localStorage.setItem('token', 'a-token');
  localStorage.setItem('userId', 'user-1');
  location = window.location;
  at('/acme');
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: location, configurable: true });
  vi.restoreAllMocks();
});

describe('reportQueryError', () => {
  it('signs out when the backend no longer knows the user, and comes back after the sign-in', () => {
    at('/acme/members', '', '?tab=roles');

    reportQueryError(errorWith('UNAUTHENTICATED'), 'mutation');

    expect(localStorage.getItem('token')).toBeNull();
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

  it('signs out when a query cannot reach the control plane', () => {
    reportQueryError(errorWith('UNAVAILABLE'), 'query');

    expect(window.location.href).toBe('/login');
  });

  it('keeps the user signed in when a mutation cannot reach it, so that they can retry', () => {
    reportQueryError(errorWith('UNAVAILABLE'), 'mutation');

    expect(localStorage.getItem('token')).toBe('a-token');
    expect(toastError).toHaveBeenCalledOnce();
  });

  it('toasts the message of any other Scylla error', () => {
    reportQueryError(errorWith('NOT_FOUND'), 'query');

    expect(toastError).toHaveBeenCalledOnce();
    expect(localStorage.getItem('token')).toBe('a-token');
  });

  it('gives an error that does not come from Scylla the generic message, not its own text', () => {
    reportQueryError(new TypeError('x is undefined'), 'query');

    expect(toastError).toHaveBeenCalledWith('An unexpected error occurred');
    expect(console.warn).toHaveBeenCalled();
  });
});
