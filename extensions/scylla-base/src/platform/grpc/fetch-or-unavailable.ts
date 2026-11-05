import { RpcError } from '@protobuf-ts/runtime-rpc';

/**
 * A request that does not get to the server is `UNAVAILABLE`. Without this, the transport gives
 * it `INTERNAL` and the text of the browser, which is different in each browser.
 */
export const fetchOrUnavailable: typeof fetch = (input, init) =>
  globalThis.fetch(input, init).catch((error: unknown) => {
    // The transport makes an abort CANCELLED itself.
    if ((error as { name?: unknown } | null)?.name === 'AbortError') throw error;
    throw new RpcError(error instanceof Error ? error.message : String(error), 'UNAVAILABLE');
  });
