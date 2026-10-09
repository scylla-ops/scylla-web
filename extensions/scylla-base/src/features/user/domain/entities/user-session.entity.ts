/** One session of a user. It holds no token: its id cannot authenticate a call. */
export interface UserSessionEntity {
  sessionId: string;
  createdAt: string;
  /** Up to five minutes old: the server moves it at most once every five minutes. */
  lastActiveAt: string;
  expiresAt: string;
  /** Empty when the client sent none. */
  userAgent: string;
  /** Empty when the server does not know it. */
  ipAddress: string;
  /** The session of the call that read the list. */
  current: boolean;
}
