// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
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

    it('marks the message as raw: it comes from the server or from an exception', () => {
      expect(ScyllaError.from(new Error('x')).raw).toBe(true);
      expect(new ScyllaError('Written for the user').raw).toBe(false);
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

    it('surfaces the raw message of the server for the codes the user can act on', () => {
      for (const code of [
        'INVALID_ARGUMENT',
        'FAILED_PRECONDITION',
        'ALREADY_EXISTS',
        'RESOURCE_EXHAUSTED',
        'NOT_FOUND',
        'INVALID_CREDENTIALS',
      ] as const) {
        expect(new ScyllaError('name must be unique', { code, raw: true }).userMessage()).toBe(
          'name must be unique',
        );
      }
    });

    it('returns a fixed message for PERMISSION_DENIED regardless of the server text', () => {
      expect(new ScyllaError('internal detail', { code: 'PERMISSION_DENIED' }).userMessage()).toBe(
        "You don't have permission to perform this action",
      );
    });

    it('never shows the raw text of a server fault or of a bug', () => {
      expect(
        new ScyllaError('panic at db.rs:42', { code: 'INTERNAL', raw: true }).userMessage(),
      ).toBe('An unexpected error occurred');
      expect(ScyllaError.from(new TypeError('x is undefined')).userMessage()).toBe(
        'An unexpected error occurred',
      );
    });

    it('shows a message of this app whatever its code', () => {
      expect(
        new ScyllaError('Sign-up is not available on this server.', {
          code: 'UNIMPLEMENTED',
        }).userMessage(),
      ).toBe('Sign-up is not available on this server.');
    });

    it('falls back to a generic message for an actionable code with no message', () => {
      expect(new ScyllaError('', { code: 'INVALID_ARGUMENT' }).userMessage()).toBe(
        'An unexpected error occurred',
      );
    });
  });

  describe('log', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it('writes a server fault or a bug as an error, with the call and the cause, in production too', () => {
      vi.stubEnv('DEV', false);
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cause = new Error('panic');

      new ScyllaError('boom', { code: 'INTERNAL', rpc: 'x.v1.S/Get', cause }).log();

      expect(error).toHaveBeenCalledWith('[ScyllaError] INTERNAL x.v1.S/Get: boom', cause);
    });

    it('writes a refusal of the server in development only', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const refusal = new ScyllaError('gone', { code: 'NOT_FOUND' });

      vi.stubEnv('DEV', false);
      refusal.log();
      expect(warn).not.toHaveBeenCalled();

      vi.stubEnv('DEV', true);
      refusal.log();
      expect(warn).toHaveBeenCalledWith('[ScyllaError] NOT_FOUND: gone');
    });
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
