import type { UnaryCall } from '@protobuf-ts/runtime-rpc';

/**
 * Stands in for a protobuf-ts unary call in a fake `I…ServiceClient`. A repository only reads
 * `.response`, so that is all this carries. The casts live here, not in every test.
 */
export const unaryCall = <TResponse extends object>(
  response: TResponse,
): UnaryCall<object, TResponse> =>
  ({ response: Promise.resolve(response) }) as unknown as UnaryCall<object, TResponse>;

/** A unary call that fails the way the transport does: `cause.code` is the gRPC status. */
export const failedCall = (code: string, message = code): UnaryCall<object, never> => {
  const response = Promise.reject(Object.assign(new Error(message), { code }));
  // Nothing may await it in a test that never reads it: keep it from failing the run.
  response.catch(() => undefined);
  return { response } as unknown as UnaryCall<object, never>;
};
