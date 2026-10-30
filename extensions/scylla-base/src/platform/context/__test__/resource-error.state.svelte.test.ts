import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { createResourceError } from '../resource-error.state.svelte.ts';

const toastError = vi.fn();
vi.mock('svelte-sonner', () => ({ toast: { error: (message: string) => toastError(message) } }));

let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  toastError.mockClear();
  navigator = installTestNavigator();
});

afterEach(() => navigator.restore());

const withCode = (code: ScyllaErrorCode, message: string) => new ScyllaError(message, { code });
const notFound = () => withCode('NOT_FOUND', 'gone');

describe('createResourceError', () => {
  it('sits still while the query is fine', () => {
    const cleanup = $effect.root(() => {
      const state = createResourceError({
        error: () => undefined,
        redirectTo: '..',
        notFoundMessage: 'App not found',
      });
      flushSync();

      expect(state.redirecting).toBe(false);
      expect(navigator.navigate).not.toHaveBeenCalled();
    });
    cleanup();
  });

  it('toasts and redirects when the resource is gone', () => {
    const cleanup = $effect.root(() => {
      const state = createResourceError({
        error: () => notFound(),
        redirectTo: '..',
        notFoundMessage: 'App not found',
      });
      flushSync();

      expect(state.redirecting).toBe(true);
      expect(toastError).toHaveBeenCalledWith('App not found');
      expect(navigator.navigate).toHaveBeenCalledWith('..', { replace: true });
    });
    cleanup();
  });

  it('leaves any other failure to the page, which can still show its error state', () => {
    const cleanup = $effect.root(() => {
      const state = createResourceError({
        error: () => withCode('UNAVAILABLE', 'backend is down'),
        redirectTo: '..',
        notFoundMessage: 'App not found',
      });
      flushSync();

      expect(state.redirecting).toBe(false);
      expect(state.scyllaError?.code).toBe('UNAVAILABLE');
      expect(navigator.navigate).not.toHaveBeenCalled();
    });
    cleanup();
  });

  it('reacts to an error that only arrives on a later render', () => {
    const cleanup = $effect.root(() => {
      // A getter: the query fails after the first read.
      let error = $state<unknown>(undefined);
      const state = createResourceError({
        error: () => error,
        redirectTo: '..',
        notFoundMessage: 'App not found',
      });
      flushSync();
      expect(state.redirecting).toBe(false);

      error = notFound();
      flushSync();

      expect(state.redirecting).toBe(true);
      expect(navigator.navigate).toHaveBeenCalledWith('..', { replace: true });
    });
    cleanup();
  });
});
