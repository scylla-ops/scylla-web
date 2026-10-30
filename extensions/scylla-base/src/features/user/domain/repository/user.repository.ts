import type { PasswordResetDelivery } from '@base/features/login';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserAccess,
  UserEntity,
  UserList,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';

export interface UserRepository {
  getAll(): Promise<UserList>;
  getById(id: string): Promise<UserEntity>;
  /** The account of the session. Needs no permission. */
  getMe(): Promise<UserEntity>;
  create(input: CreateUserInput): Promise<UserEntity>;
  update(input: UpdateUserInput): Promise<UserEntity>;
  delete(userId: string): Promise<void>;
  /** Deactivation signs the user out and blocks the sign-in. Never on the own id. */
  setActive(userId: string, isActive: boolean): Promise<UserEntity>;
  /** Of the session's account. Signs out its other sessions. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  sendPasswordReset(userId: string): Promise<PasswordResetDelivery>;
  /** The number of sessions revoked. For the own id, the current session stays. */
  revokeSessions(userId: string): Promise<number>;
  /** Of the session's account, with its password. */
  deleteAccount(password: string): Promise<void>;
  listAccess(userId: string): Promise<UserAccess[]>;
  /** The sessions that have not expired, the most recently active first. */
  listSessions(userId: string): Promise<UserSessionEntity[]>;
  /** The current session can be revoked too: its caller is then signed out. */
  revokeSession(userId: string, sessionId: string): Promise<void>;
}
