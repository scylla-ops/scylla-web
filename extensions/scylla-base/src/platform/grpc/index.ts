import { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';
import { closeSession, forgetSession, openSession, refreshSession, restoreSession } from './session.ts';

export { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';
export type { IssuedToken } from '@base/generated/scylla/auth/v1/token_service.ts';

export const grpcTransport = new ScyllaGrpcTransport();

/**
 * The token side of the browser session. Only `features/login` uses it: a sign-in opens it, a
 * sign-out closes it, the auth guard restores it after a reload.
 */
export const browserSession = {
  open: openSession,
  forget: forgetSession,
  refresh: refreshSession,
  restore: restoreSession,
  close: closeSession,
} as const;
