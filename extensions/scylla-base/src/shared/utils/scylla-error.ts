import { t } from '@lingui/core/macro';
import type { GrpcStatusCode } from '@protobuf-ts/grpcweb-transport';

/** The gRPC status names, plus our own codes (e.g. `INVALID_CREDENTIALS` from `login`). */
export type ScyllaErrorCode = keyof typeof GrpcStatusCode | 'UNKNOWN_ERROR' | 'INVALID_CREDENTIALS';

export interface ScyllaErrorOptions extends ErrorOptions {
  code?: ScyllaErrorCode;
  /** The call that failed, e.g. `scylla.secret.v1.SecretService/ListSecrets`. */
  rpc?: string;
  /**
   * The message is a text of the server or of an exception, not a text of this app: the user
   * sees it only for a code that they can act on.
   */
  raw?: boolean;
}

/** The codes whose raw message tells the user what to change. Any other stays in the log. */
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

/** The refusals that the server gives on purpose: a normal answer, not a fault. */
const EXPECTED_CODES: ReadonlySet<ScyllaErrorCode> = new Set<ScyllaErrorCode>([
  ...USER_FACING_CODES,
  ...TRANSIENT_CODES,
  'PERMISSION_DENIED',
  'UNAUTHENTICATED',
  'CANCELLED',
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
  public readonly rpc?: string;
  public readonly raw: boolean;

  constructor(
    message: string,
    { code = 'UNKNOWN_ERROR', rpc, raw = false, ...options }: ScyllaErrorOptions = {},
  ) {
    super(message, options);
    this.code = code;
    this.rpc = rpc;
    this.raw = raw;
  }

  /** Any thrown value: a `ScyllaError` as it is, an error that carries a gRPC code with it. */
  public static from(error: unknown): ScyllaError {
    if (error instanceof ScyllaError) return error;
    return new ScyllaError(error instanceof Error ? error.message : String(error), {
      code: codeOf(error),
      raw: true,
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

  /** A message of this app as it is; a raw message only for a code that the user can act on. */
  public userMessage(): string {
    if (this.isNetworkError()) return t`Server unreachable`;
    if (this.isForbidden()) return t`You don't have permission to perform this action`;
    if (this.message && (!this.raw || USER_FACING_CODES.has(this.code))) return this.message;
    return t`An unexpected error occurred`;
  }

  /**
   * A refusal of the server is written in development only. A server fault or a bug is written
   * in production too, with its cause: it is what a user can send to the support.
   */
  public log(): void {
    const line = `[${this.name}] ${this.code}${this.rpc ? ` ${this.rpc}` : ''}: ${this.message}`;
    const details = this.cause === undefined ? [] : [this.cause];
    if (!EXPECTED_CODES.has(this.code)) console.error(line, ...details);
    else if (import.meta.env.DEV) console.warn(line, ...details);
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
