import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type {
  CreateUserRequest,
  ListUsersResponse,
  UpdateUserRequest,
  User,
  UserAccess,
} from '@base/generated/scylla/user/v1/user.ts';

export interface UserRemoteDataSource {
  getAll(): Promise<ScyllaResult<ListUsersResponse>>;
  getById(id: string): Promise<ScyllaResult<User>>;
  getMe(): Promise<ScyllaResult<User>>;
  create(request: CreateUserRequest): Promise<ScyllaResult<User>>;
  update(request: UpdateUserRequest): Promise<ScyllaResult<User>>;
  delete(userId: string): Promise<ScyllaResult<void>>;
  setActive(userId: string, isActive: boolean): Promise<ScyllaResult<User>>;
  changePassword(currentPassword: string, newPassword: string): Promise<ScyllaResult<void>>;
  sendPasswordReset(userId: string): Promise<ScyllaResult<PasswordResetDelivery>>;
  revokeSessions(userId: string): Promise<ScyllaResult<number>>;
  deleteAccount(password: string): Promise<ScyllaResult<void>>;
  listAccess(userId: string): Promise<ScyllaResult<UserAccess[]>>;
}
