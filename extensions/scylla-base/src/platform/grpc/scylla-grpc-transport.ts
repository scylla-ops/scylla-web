import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import {
  RpcError,
  RpcOutputStreamController,
  ServerStreamingCall,
  UnaryCall,
} from '@protobuf-ts/runtime-rpc';
import type { RpcInterceptor, RpcOptions } from '@protobuf-ts/runtime-rpc';
import { ScyllaError, type ScyllaErrorCode } from '@shared/utils/scylla-error.ts';

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

const toScyllaError = (error: unknown): ScyllaError =>
  error instanceof RpcError
    ? new ScyllaError(decode(error.message), {
        // A cast: the value comes from the wire. An unknown code matches no branch.
        code: error.code as ScyllaErrorCode,
        cause: error,
      })
    : ScyllaError.from(error);

/** The rejection stays handled: a caller reads `response` only, not the headers or the status. */
const rejectingWith = <T>(promise: Promise<T>): Promise<T> => {
  const converted = promise.catch((error: unknown) => {
    throw toScyllaError(error);
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
      rejectingWith(call.headers),
      rejectingWith(call.response),
      rejectingWith(call.status),
      rejectingWith(call.trailers),
    );
  },
  interceptServerStreaming(next, method, input, options) {
    const call = next(method, input, options);
    const responses = new RpcOutputStreamController<object>();
    call.responses.onNext((message, error, complete) =>
      responses.notifyNext(message, error && toScyllaError(error), complete),
    );
    return new ServerStreamingCall(
      method,
      call.requestHeaders,
      call.request,
      rejectingWith(call.headers),
      responses,
      rejectingWith(call.status),
      rejectingWith(call.trailers),
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

export class ScyllaGrpcTransport {
  private readonly _transport: GrpcWebFetchTransport;

  constructor() {
    const authInterceptor: RpcInterceptor = {
      interceptUnary(next, method, input, options: RpcOptions) {
        options.meta = options.meta ?? {};
        const token = localStorage.getItem('token');
        if (token) {
          options.meta['Authorization'] = `Bearer ${token}`;
        }
        return next(method, input, options);
      },
    };
    this._transport = new GrpcWebFetchTransport({
      baseUrl: import.meta.env.VITE_API_URL ?? '',
      format: 'binary',
      fetch: fetchOrUnavailable,
      interceptors: [authInterceptor, scyllaErrorInterceptor],
    });
  }

  getTransport(): GrpcWebFetchTransport {
    return this._transport;
  }
}
