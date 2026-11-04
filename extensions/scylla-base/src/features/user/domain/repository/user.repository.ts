import type { PasswordResetDelivery } from '@base/features/login';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
  UserList,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { SignInMethodsOfUser } from '@base/features/user/domain/entities/identity.entity.ts';

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
  /** The sessions that have not expired, the most recently active first. */
  listSessions(userId: string): Promise<UserSessionEntity[]>;
  /**
   * The current session can be revoked too: its caller is then signed out. Only for the own id:
   * for another user, revoke each session with `revokeSessions`.
   */
  revokeSession(userId: string, sessionId: string): Promise<void>;
  /** Of the session's account: a link goes to the new email. The same answer for a used email. */
  requestEmailChange(newEmail: string, password: string): Promise<void>;
  /** With the token of that link: the new email becomes the primary one. */
  confirmEmailChange(token: string): Promise<UserEntity>;
  /** Of the session's account. */
  listSignInMethods(): Promise<SignInMethodsOfUser>;
  /** FAILED_PRECONDITION with LAST_SIGN_IN_METHOD for the last way to sign in. */
  unlinkIdentity(provider: string, subject: string): Promise<void>;
  /** For an admin of the instance. The last active admin stays: LAST_ADMIN. */
  setInstanceAdmin(userId: string, admin: boolean): Promise<void>;
}
