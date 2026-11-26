import { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';
import {
  apiUrl,
  closeSession,
  forgetSession,
  marketplaceIsLocal,
  marketplaceUrl,
  openSession,
  refreshSession,
  restoreSession,
} from './session.ts';

export { apiAnswers, serviceStatus } from './service-status.svelte.ts';
export { ScyllaGrpcTransport } from './scylla-grpc-transport.ts';
export type { IssuedToken } from '@base/generated/scylla/auth/v1/token_service.ts';

export const grpcTransport = new ScyllaGrpcTransport();

/**
 * The marketplace that Scylla hosts (`VITE_MARKETPLACE_API_URL`). Its reads need no token: the
 * token of the session goes only to the server that issued it.
 */
export const marketplaceTransport = new ScyllaGrpcTransport({
  baseUrl: marketplaceUrl(),
  withToken: marketplaceIsLocal(),
});

export { marketplaceIsLocal, marketplaceUrl };

/**
 * The URL of an image that the API keeps (`GET /images/{id}`), e.g. the icon of a project. An
 * `<img>` reads it with no token: the id is the secret, and an image never changes.
 */
export const imageUrl = (imageId: string): string =>
  `${apiUrl()}/images/${encodeURIComponent(imageId)}`;

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
