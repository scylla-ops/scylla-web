/**
 * The only writer of the session. `platform/grpc`'s transport reads `token` for the
 * `Authorization` header, and `shell/.../Auth.guard.svelte` reads it to decide whether to
 * redirect — the three must agree on the keys. A sign-up (`scylla-cloud`) opens a session the
 * same way: it never writes to `localStorage` itself.
 *
 * TODO: HTTP cookies instead.
 */
export const openSession = (token: string, userId: string): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', userId);
};
