// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ScyllaError, refusalOf } from '../scylla-error.ts';

describe('ScyllaError', () => {
  it('is an UNKNOWN_ERROR when it is given no code', () => {
    expect(new ScyllaError('boom').code).toBe('UNKNOWN_ERROR');
  });

  it('keeps the code it is given', () => {
    const err = new ScyllaError('boom', { code: 'NOT_FOUND' });
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isNotFound()).toBe(true);
    expect(err.isForbidden()).toBe(false);
  });

  it('is still an Error, with its own name', () => {
    const err = new ScyllaError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ScyllaError');
  });

  it('recognizes PERMISSION_DENIED as forbidden', () => {
    expect(new ScyllaError('boom', { code: 'PERMISSION_DENIED' }).isForbidden()).toBe(true);
  });

  it('recognizes ALREADY_EXISTS', () => {
    expect(new ScyllaError('boom', { code: 'ALREADY_EXISTS' }).isAlreadyExists()).toBe(true);
  });

  it('is a network error only when UNAVAILABLE, whatever the text of the browser', () => {
    expect(new ScyllaError('boom', { code: 'UNAVAILABLE' }).isNetworkError()).toBe(true);
    expect(new ScyllaError('Failed to fetch', { code: 'INTERNAL' }).isNetworkError()).toBe(false);
  });

  it('is transient for the failures that a second call can pass', () => {
    for (const code of ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'ABORTED'] as const) {
      expect(new ScyllaError('boom', { code }).isTransient()).toBe(true);
    }
    for (const code of [
      'NOT_FOUND',
      'PERMISSION_DENIED',
      'INVALID_ARGUMENT',
      'UNKNOWN_ERROR',
    ] as const) {
      expect(new ScyllaError('boom', { code }).isTransient()).toBe(false);
    }
  });

  describe('from', () => {
    it('gives a ScyllaError back as it is', () => {
      const err = new ScyllaError('boom', { code: 'NOT_FOUND' });
      expect(ScyllaError.from(err)).toBe(err);
    });

    it('keeps the gRPC code of an error that carries one', () => {
      const cause = Object.assign(new Error('no such user'), { code: 'UNAUTHENTICATED' });
      const err = ScyllaError.from(cause);
      expect(err.code).toBe('UNAUTHENTICATED');
      expect(err.message).toBe('no such user');
      expect(err.cause).toBe(cause);
    });

    it('makes any other thrown value an UNKNOWN_ERROR', () => {
      expect(ScyllaError.from(new TypeError('x is undefined')).code).toBe('UNKNOWN_ERROR');
      expect(ScyllaError.from('a string').message).toBe('a string');
    });

    it('ignores a code that is not a string, as on a DOMException', () => {
      expect(ScyllaError.from(Object.assign(new Error('abort'), { code: 20 })).code).toBe(
        'UNKNOWN_ERROR',
      );
    });
  });

  describe('userMessage', () => {
    it('returns a generic message for network errors, never leaking transport details', () => {
      expect(new ScyllaError('Load failed', { code: 'UNAVAILABLE' }).userMessage()).toBe(
        'Server unreachable',
      );
    });

    it('surfaces the message for the codes the user can act on', () => {
      for (const code of [
        'INVALID_ARGUMENT',
        'FAILED_PRECONDITION',
        'ALREADY_EXISTS',
        'RESOURCE_EXHAUSTED',
        'NOT_FOUND',
        'INVALID_CREDENTIALS',
      ] as const) {
        expect(new ScyllaError('name must be unique', { code }).userMessage()).toBe(
          'name must be unique',
        );
      }
    });

    it('returns a fixed message for PERMISSION_DENIED regardless of the server text', () => {
      expect(new ScyllaError('internal detail', { code: 'PERMISSION_DENIED' }).userMessage()).toBe(
        "You don't have permission to perform this action",
      );
    });

    it('never shows the text of a server fault or of a bug', () => {
      expect(new ScyllaError('panic at db.rs:42', { code: 'INTERNAL' }).userMessage()).toBe(
        'An unexpected error occurred',
      );
      expect(ScyllaError.from(new TypeError('x is undefined')).userMessage()).toBe(
        'An unexpected error occurred',
      );
    });

    it('falls back to a generic message for an actionable code with no message', () => {
      expect(new ScyllaError('', { code: 'INVALID_ARGUMENT' }).userMessage()).toBe(
        'An unexpected error occurred',
      );
    });
  });

  it('log() warns with the message and, if present, the cause — never throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = new ScyllaError('boom', { cause: new Error('root cause') });
    expect(() => err.log()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});

describe('refusalOf', () => {
  const failure = (code: string, message: string) =>
    Promise.reject(Object.assign(new Error(message), { code }));

  it('is null on success', async () => {
    await expect(refusalOf(Promise.resolve())).resolves.toBeNull();
  });

  it('gives the server message of a FAILED_PRECONDITION, without throwing', async () => {
    await expect(refusalOf(failure('FAILED_PRECONDITION', 'Hand over acme first'))).resolves.toBe(
      'Hand over acme first',
    );
  });

  it('throws any other error as it is, for the global handler', async () => {
    const down = new ScyllaError('down', { code: 'UNAVAILABLE' });
    await expect(refusalOf(Promise.reject(down))).rejects.toBe(down);
  });
});
