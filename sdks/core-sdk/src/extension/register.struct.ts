/**
 * Filled by the extension that owns access control, so that a route's
 * `permission` has that extension's type:
 *
 *   declare module '@scylla/core-sdk' {
 *     interface Register { permission: Permission }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- filled by declaration merging
export interface Register {}

/** `never` until an extension registers its permission type: no route can declare one. */
export type RoutePermission = Register extends { permission: infer P } ? P : never;
