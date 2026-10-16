import { type ScyllaGrpcTransport } from '@platform/grpc';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import type {
  CreateUserRequest,
  ListUsersResponse,
  UpdateUserRequest,
  User,
  UserAccess,
  UserSession,
} from '@base/generated/scylla/user/v1/user.ts';
import { UserServiceClient } from '@base/generated/scylla/user/v1/user.client.ts';
import type { UserRemoteDataSource } from '@base/features/user/infrastructure/repository/data-sources/user-remote.data-source.ts';
import { wrapId } from '@shared/infrastructure/grpc/wrappers.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass an empty user on. */
function requireUser(user: User | undefined): User {
  if (!user) throw new Error('Server returned a response without a user.');
  return user;
}

export class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  private readonly _userClient: UserServiceClient;

  constructor(transport: ScyllaGrpcTransport) {
    this._userClient = new UserServiceClient(transport.getTransport());
  }

  public async getAll(): Promise<ScyllaResult<ListUsersResponse>> {
    return ScyllaResult.tryAsync<ListUsersResponse>(
      async () => await this._userClient.listUsers({}).response,
      'Failed to fetch users.',
    );
  }

  public async getById(userId: string): Promise<ScyllaResult<User>> {
    return ScyllaResult.tryAsync<User>(
      async () =>
        requireUser((await this._userClient.getUser({ userId: wrapId(userId) }).response).user),
      'Error fetching user',
    );
  }

  public async getMe(): Promise<ScyllaResult<User>> {
    return ScyllaResult.tryAsync<User>(
      async () => requireUser((await this._userClient.getMe({}).response).user),
      'Failed to fetch your account.',
    );
  }

  public async create(request: CreateUserRequest): Promise<ScyllaResult<User>> {
    return ScyllaResult.tryAsync<User>(
      async () => requireUser((await this._userClient.createUser(request).response).user),
      'Failed to create user.',
    );
  }

  public async update(request: UpdateUserRequest): Promise<ScyllaResult<User>> {
    return ScyllaResult.tryAsync<User>(
      async () => requireUser((await this._userClient.updateUser(request).response).user),
      'Failed to update user.',
    );
  }

  public async delete(userId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync<void>(async () => {
      await this._userClient.deleteUser({ userId: wrapId(userId) }).response;
    }, 'Failed to delete user.');
  }

  public async setActive(userId: string, isActive: boolean): Promise<ScyllaResult<User>> {
    return ScyllaResult.tryAsync<User>(
      async () =>
        requireUser(
          (await this._userClient.setUserActive({ userId: wrapId(userId), isActive }).response)
            .user,
        ),
      'Failed to change the status of the user.',
    );
  }

  public async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync<void>(async () => {
      await this._userClient.changePassword({ currentPassword, newPassword }).response;
    }, 'Failed to change the password.');
  }

  public async sendPasswordReset(userId: string): Promise<ScyllaResult<PasswordResetDelivery>> {
    return ScyllaResult.tryAsync<PasswordResetDelivery>(
      async () =>
        (await this._userClient.sendPasswordReset({ userId: wrapId(userId) }).response).delivery,
      'Failed to send a reset link.',
    );
  }

  public async revokeSessions(userId: string): Promise<ScyllaResult<number>> {
    return ScyllaResult.tryAsync<number>(
      async () =>
        (await this._userClient.revokeUserSessions({ userId: wrapId(userId) }).response).revoked,
      'Failed to sign out the sessions.',
    );
  }

  public async deleteAccount(password: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync<void>(async () => {
      await this._userClient.deleteAccount({ password }).response;
    }, 'Failed to delete the account.');
  }

  public async listAccess(userId: string): Promise<ScyllaResult<UserAccess[]>> {
    return ScyllaResult.tryAsync<UserAccess[]>(
      async () =>
        (await this._userClient.listUserAccess({ userId: wrapId(userId) }).response).access,
      'Failed to fetch the organizations and roles of the user.',
    );
  }

  public async listSessions(userId: string): Promise<ScyllaResult<UserSession[]>> {
    return ScyllaResult.tryAsync<UserSession[]>(
      async () =>
        (await this._userClient.listUserSessions({ userId: wrapId(userId) }).response).sessions,
      'Failed to fetch the sessions of the user.',
    );
  }

  public async revokeSession(userId: string, sessionId: string): Promise<ScyllaResult<void>> {
    return ScyllaResult.tryAsync<void>(async () => {
      await this._userClient.revokeUserSession({
        userId: wrapId(userId),
        sessionId: wrapId(sessionId),
      }).response;
    }, 'Failed to sign out the session.');
  }
}
