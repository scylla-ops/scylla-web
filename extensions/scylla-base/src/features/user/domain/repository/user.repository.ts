import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/features/login';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserAccess } from '@base/features/user/domain/structs/user-access.struct.ts';
import type { UserList } from '@base/features/user/domain/structs/user.struct.ts';

export interface UserRepository {
  getAll(): Promise<ScyllaResult<UserList>>;
  getById(id: string): Promise<ScyllaResult<UserEntity>>;
  /** The account of the session. Needs no permission. */
  getMe(): Promise<ScyllaResult<UserEntity>>;
  create(input: CreateUserInput): Promise<ScyllaResult<UserEntity>>;
  update(input: UpdateUserInput): Promise<ScyllaResult<UserEntity>>;
  delete(userId: string): Promise<ScyllaResult<void>>;
  /** Deactivation signs the user out and blocks the sign-in. Never on the own id. */
  setActive(userId: string, isActive: boolean): Promise<ScyllaResult<UserEntity>>;
  /** Of the session's account. Signs out its other sessions. */
  changePassword(currentPassword: string, newPassword: string): Promise<ScyllaResult<void>>;
  sendPasswordReset(userId: string): Promise<ScyllaResult<PasswordResetDelivery>>;
  /** The number of sessions revoked. For the own id, the current session stays. */
  revokeSessions(userId: string): Promise<ScyllaResult<number>>;
  /** Of the session's account, with its password. */
  deleteAccount(password: string): Promise<ScyllaResult<void>>;
  listAccess(userId: string): Promise<ScyllaResult<UserAccess[]>>;
}
