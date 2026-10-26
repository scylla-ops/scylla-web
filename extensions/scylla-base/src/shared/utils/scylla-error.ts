import { t } from '@lingui/core/macro';
import type { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';

/** The gRPC status names, plus our own codes (e.g. `INVALID_CREDENTIALS` from `login`). */
export type ScyllaErrorCode = keyof typeof GrpcStatusCode | 'UNKNOWN_ERROR' | 'INVALID_CREDENTIALS';

export interface ScyllaErrorOptions extends ErrorOptions {
  code?: ScyllaErrorCode;
}

/** The codes whose message tells the user what to change. Any other message stays in the log. */
const USER_FACING_CODES: ReadonlySet<ScyllaErrorCode> = new Set<ScyllaErrorCode>([
  'INVALID_ARGUMENT',
  'FAILED_PRECONDITION',
  'ALREADY_EXISTS',
  'RESOURCE_EXHAUSTED',
  'NOT_FOUND',
  'INVALID_CREDENTIALS',
]);

/** The failures that can pass if the same call is sent again. */
const TRANSIENT_CODES: ReadonlySet<ScyllaErrorCode> = new Set<ScyllaErrorCode>([
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'ABORTED',
]);

const codeOf = (error: unknown): ScyllaErrorCode | undefined =>
  error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? // A cast: the value comes from the wire. An unknown code matches no branch.
      (error.code as ScyllaErrorCode)
    : undefined;

/**
 * The one error type of the app. The gRPC transport rejects every failed call with it, and a
 * repository throws it for a refusal of its own.
 */
export class ScyllaError extends Error {
  public override readonly name = 'ScyllaError';
  public readonly code: ScyllaErrorCode;

  constructor(message: string, { code = 'UNKNOWN_ERROR', ...options }: ScyllaErrorOptions = {}) {
    super(message, options);
    this.code = code;
  }

  /** Any thrown value: a `ScyllaError` as it is, an error that carries a gRPC code with it. */
  public static from(error: unknown): ScyllaError {
    if (error instanceof ScyllaError) return error;
    return new ScyllaError(error instanceof Error ? error.message : String(error), {
      code: codeOf(error),
      cause: error,
    });
  }

  /** The transport gives `UNAVAILABLE` to a request that did not get to the server. */
  public isNetworkError(): boolean {
    return this.code === 'UNAVAILABLE';
  }

  public isTransient(): boolean {
    return TRANSIENT_CODES.has(this.code);
  }

  public isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }

  public isForbidden(): boolean {
    return this.code === 'PERMISSION_DENIED';
  }

  public isAlreadyExists(): boolean {
    return this.code === 'ALREADY_EXISTS';
  }

  public userMessage(): string {
    if (this.isNetworkError()) return t`Server unreachable`;
    if (this.isForbidden()) return t`You don't have permission to perform this action`;
    if (USER_FACING_CODES.has(this.code) && this.message) return this.message;
    return t`An unexpected error occurred`;
  }

  public log(): void {
    console.warn(`>[${this.name}] ${this.code}:`, this.message);
    if (this.cause) {
      console.warn('Original cause:', this.cause);
    }
  }
}

/**
 * For a call whose FAILED_PRECONDITION the page shows itself, beside a field: gives the server
 * message instead of throwing it to the global error toast, which would show it a second time.
 * `null` on success; any other error throws, inside a `mutationFn`.
 */
export const refusalOf = async (call: Promise<unknown>): Promise<string | null> => {
  try {
    await call;
    return null;
  } catch (error) {
    const refusal = ScyllaError.from(error);
    if (refusal.code === 'FAILED_PRECONDITION') return refusal.userMessage();
    throw error;
  }
};
