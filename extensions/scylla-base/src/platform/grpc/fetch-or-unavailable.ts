import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * The maintenance page answers 503 with this header. The automatic maintenance page of the proxy
 * answers 200 with HTML. Neither is an answer of the API: a gRPC-Web answer has a
 * `application/grpc-web` content type.
 */
const isOutagePage = (response: Response): boolean =>
  response.headers.has('x-scylla-maintenance') ||
  (response.headers.get('content-type') ?? '').toLowerCase().includes('text/html');

/**
 * A request that does not get to the server is `UNAVAILABLE`. Without this, the transport gives
 * it `INTERNAL` and the text of the browser, which is different in each browser. An answer of a
 * maintenance page is `UNAVAILABLE` too.
 */
export const fetchOrUnavailable: typeof fetch = (input, init) =>
  globalThis.fetch(input, init).then(
    response => {
      if (!isOutagePage(response)) return response;
      void response.body?.cancel();
      throw new RpcError('Service unavailable', 'UNAVAILABLE');
    },
    (error: unknown) => {
      // The transport makes an abort CANCELLED itself.
      if ((error as { name?: unknown } | null)?.name === 'AbortError') throw error;
      throw new RpcError(error instanceof Error ? error.message : String(error), 'UNAVAILABLE');
    },
  );
