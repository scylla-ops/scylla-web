import { base64decode } from '@protobuf-ts/runtime';
import type { RpcMetadata } from '@protobuf-ts/runtime-rpc';
import { Status } from '@base/generated/google/rpc/status.ts';
import { BadRequest, ErrorInfo } from '@base/generated/google/rpc/error_details.ts';
import type { FieldViolation } from '@shared/utils/scylla-error.ts';

/** The details of a failed call that the server sends in `grpc-status-details-bin`. */
export interface StatusDetails {
  /** The stable code of a refusal, e.g. `SLUG_IN_USE`. */
  reason?: string;
  /** The values that come with the reason, e.g. `retry_after_seconds`. */
  metadata: Record<string, string>;
  /** The fields that are not valid, for `INVALID_ARGUMENT`. */
  violations: FieldViolation[];
}

const NONE: StatusDetails = { metadata: {}, violations: [] };
const TYPE_PREFIX = 'type.googleapis.com/';

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Reads the details from the headers or the trailers of a call. An unreadable value gives none. */
export const statusDetailsOf = (meta: RpcMetadata | undefined): StatusDetails => {
  const encoded = first(meta?.['grpc-status-details-bin']);
  if (!encoded) return NONE;
  try {
    const status = Status.fromBinary(base64decode(encoded));
    const details: StatusDetails = { metadata: {}, violations: [] };
    for (const any of status.details) {
      const type = any.typeUrl.startsWith(TYPE_PREFIX)
        ? any.typeUrl.slice(TYPE_PREFIX.length)
        : any.typeUrl;
      if (type === 'google.rpc.ErrorInfo') {
        const info = ErrorInfo.fromBinary(any.value);
        details.reason = info.reason;
        details.metadata = info.metadata;
      } else if (type === 'google.rpc.BadRequest') {
        const request = BadRequest.fromBinary(any.value);
        details.violations = request.fieldViolations.map(({ field, description }) => ({
          field,
          description,
        }));
      }
    }
    return details;
  } catch {
    // Not a valid Status: the code and the message are still there.
    return NONE;
  }
};
