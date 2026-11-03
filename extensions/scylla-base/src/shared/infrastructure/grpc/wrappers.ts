// The protos wrap ids (`{ value }`) and times (`Timestamp`); the domain uses plain
// strings. Use these helpers only in mappers and repositories.

import { ScyllaError } from '@shared/utils/scylla-error.ts';

/**
 * The entity, or the id, a response must carry. The server fills it on success, so an absent one
 * (or an empty id) is a fault of the protocol, not a refusal: `MALFORMED_RESPONSE`, with `what`
 * for the log.
 */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value == null || value === '') {
    throw new ScyllaError(`The server response carried no ${what}.`, {
      code: 'MALFORMED_RESPONSE',
      raw: true,
    });
  }
  return value;
}

export function idValue(wrapper?: { value: string }): string {
  return wrapper?.value ?? '';
}

export function wrapId(value: string): { value: string } {
  return { value };
}

/** `undefined` for an absent id, so the optional proto field stays unset. */
export function wrapIdOpt(value?: string): { value: string } | undefined {
  return value ? { value } : undefined;
}

/** An empty string when the timestamp is absent. */
export function timestampToIso(timestamp?: {
  seconds: bigint | string | number;
  nanos: number;
}): string {
  if (!timestamp) return '';

  // `seconds` may be a bigint or a number: convert before mixing them.
  const secondsMs = BigInt(timestamp.seconds) * 1000n;
  const nanosMs = BigInt(Math.floor(timestamp.nanos / 1_000_000));
  const totalMillis = Number(secondsMs + nanosMs);

  const date = new Date(totalMillis);

  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString();
}

export function timestampToIsoOpt(timestamp?: {
  seconds: bigint | string | number;
  nanos: number;
}): string | undefined {
  if (!timestamp) return undefined;

  if (BigInt(timestamp.seconds) === 0n && timestamp.nanos === 0) {
    return undefined;
  }

  const iso = timestampToIso(timestamp);
  return iso === '' ? undefined : iso;
}
