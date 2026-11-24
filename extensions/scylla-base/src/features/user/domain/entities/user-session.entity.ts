/** One session of a user. It holds no token: its id cannot authenticate a call. */
export interface UserSessionEntity {
  id: string;
  createdAt: string;
  /** The last refresh of the session. */
  lastActiveAt: string;
  /** How the session was opened, e.g. `password` or `oidc`. */
  methods?: string[];
  /** Empty when the client sent none. */
  userAgent: string;
  /** Empty when the server does not know it. */
  ipAddress: string;
  /** The session of the call that read the list. */
  current: boolean;
}
