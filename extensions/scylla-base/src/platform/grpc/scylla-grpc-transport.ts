import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import {
  RpcError,
  RpcOutputStreamController,
  ServerStreamingCall,
  UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import type { MethodInfo, RpcInterceptor } from '@protobuf-ts/runtime-rpc';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';
import { accessToken, apiUrl, isPublicCall, refreshSession } from './session.ts';
import { statusDetailsOf } from './status-details.ts';

/**
 * The server percent-encodes the `grpc-message` trailer and
 * `@protobuf-ts/grpcweb-transport` does not decode it.
 */
const decode = (message: string): string => {
  try {
    return decodeURIComponent(message);
  } catch {
    // Not valid percent-encoding: keep the raw message.
    return message;
  }
};

const requestIdOf = (meta: RpcError['meta']): { requestId?: string } => {
  const value = meta['x-request-id'];
  const requestId = Array.isArray(value) ? value[0] : value;
  return requestId ? { requestId } : {};
};

const toScyllaError = (error: unknown, method: MethodInfo): ScyllaError =>
  error instanceof RpcError
    ? new ScyllaError(decode(error.message), {
        // A cast: the value comes from the wire. An unknown code matches no branch.
        code: error.code as ScyllaErrorCode,
        rpc: `${method.service.typeName}/${method.name}`,
        ...requestIdOf(error.meta),
        raw: true,
        cause: error,
        ...statusDetailsOf(error.meta),
      })
    : ScyllaError.from(error);

/** The rejection stays handled: a caller reads `response` only, not the headers or the status. */
const rejectingWith = <T>(promise: Promise<T>, method: MethodInfo): Promise<T> => {
  const converted = promise.catch((error: unknown) => {
    throw toScyllaError(error, method);
  });
  converted.catch(() => undefined);
  return converted;
};

/** Every failed call rejects with a `ScyllaError`: a repository only awaits the call. */
const scyllaErrorInterceptor: RpcInterceptor = {
  interceptUnary(next, method, input, options) {
    const call = next(method, input, options);
    return new UnaryCall(
      method,
      call.requestHeaders,
      call.request,
      rejectingWith(call.headers, method),
      rejectingWith(call.response, method),
      rejectingWith(call.status, method),
      rejectingWith(call.trailers, method),
    );
  },
  interceptServerStreaming(next, method, input, options) {
    const call = next(method, input, options);
    const responses = new RpcOutputStreamController<object>();
    call.responses.onNext((message, error, complete) =>
      responses.notifyNext(message, error && toScyllaError(error, method), complete),
    );
    return new ServerStreamingCall(
      method,
      call.requestHeaders,
      call.request,
      rejectingWith(call.headers, method),
      responses,
      rejectingWith(call.status, method),
      rejectingWith(call.trailers, method),
    );
  },
};

/**
 * A request that does not get to the server is `UNAVAILABLE`. Without this, the transport gives
 * it `INTERNAL` and the text of the browser, which is different in each browser.
 */
const fetchOrUnavailable: typeof fetch = (input, init) =>
  globalThis.fetch(input, init).catch((error: unknown) => {
    // The transport makes an abort CANCELLED itself.
    if ((error as { name?: unknown } | null)?.name === 'AbortError') throw error;
    throw new RpcError(error instanceof Error ? error.message : String(error), 'UNAVAILABLE');
  });

/** The gRPC code of an answer that has only a status: the server gives it before any message. */
const UNAUTHENTICATED = '16';

const send = (input: RequestInfo | URL, init: RequestInit | undefined, token: string | null) => {
  const headers = new Headers(init?.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  else headers.delete('authorization');
  return fetchOrUnavailable(input, { ...init, headers, credentials: 'include' });
};

/**
 * Adds the access token to each call, for unary calls and for streams. An `UNAUTHENTICATED`
 * answer gets one refresh and one more try: the token can end between the check and the call.
 */
const authorizedFetch: typeof fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (isPublicCall(url)) return send(input, init, null);
  const sent = await accessToken();
  const response = await send(input, init, sent);
  // No token: the refresh already failed, a second one fails too.
  if (!sent || response.headers.get('grpc-status') !== UNAUTHENTICATED) return response;
  const token = await refreshSession();
  if (!token) return response;
  await response.body?.cancel();
  return send(input, init, token);
};

export class ScyllaGrpcTransport {
  private readonly _transport: GrpcWebFetchTransport;

  constructor() {
    this._transport = new GrpcWebFetchTransport({
      baseUrl: apiUrl(),
      format: 'binary',
      fetch: authorizedFetch,
      interceptors: [scyllaErrorInterceptor],
    });
  }

  getTransport(): GrpcWebFetchTransport {
    return this._transport;
  }
}
