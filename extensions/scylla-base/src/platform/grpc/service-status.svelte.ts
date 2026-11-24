import { apiUrl } from './session.ts';

/**
 * Whether the API answers. One flag for the whole app: the banner of the shell reads it, so an
 * outage shows one banner and not one error for each failed call.
 */
export const serviceStatus = $state({ unavailable: false });

export const markServiceUnavailable = (): void => {
  serviceStatus.unavailable = true;
};

/** The server answers a call that it does not know with a gRPC-Web status: `content-type` tells. */
const PROBE_PATH = '/scylla.health.v1.Probe/Ping';

/**
 * Whether the API itself answers now, and not the maintenance page or the page of the proxy. The
 * probe is a gRPC-Web call to a method that does not exist: the server refuses it with a gRPC
 * answer, which the pages of an outage never give.
 */
export const apiAnswers = async (): Promise<boolean> => {
  try {
    const response = await globalThis.fetch(`${apiUrl()}${PROBE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/grpc-web+proto', 'x-grpc-web': '1' },
      body: new Uint8Array(5),
    });
    await response.body?.cancel();
    return (
      !response.headers.has('x-scylla-maintenance') &&
      (response.headers.get('content-type') ?? '').startsWith('application/grpc')
    );
  } catch {
    return false;
  }
};
