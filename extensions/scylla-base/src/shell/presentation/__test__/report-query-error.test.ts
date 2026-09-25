import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-result.ts';
import { reportQueryError } from '../report-query-error.ts';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

const errorWith = (code: string) => new ScyllaError('boom', { cause: { code } });
let location: Location;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.setItem('token', 'a-token');
  location = window.location;
  Object.defineProperty(window, 'location', { value: { href: '/acme' }, configurable: true });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: location, configurable: true });
  vi.restoreAllMocks();
});

describe('reportQueryError', () => {
  it('signs out when the backend no longer knows the user', () => {
    reportQueryError(errorWith('UNAUTHENTICATED'), 'mutation');

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
    expect(toastError).not.toHaveBeenCalled();
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

  it('only logs an error that does not come from Scylla', () => {
    reportQueryError(new Error('boom'), 'query');

    expect(toastError).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
