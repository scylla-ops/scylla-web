import type { UserRepository } from '@base/features/user/domain/repository/user.repository.ts';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserEntity,
} from '@base/features/user/domain/entities/user.entity.ts';
import type { UserSessionEntity } from '@base/features/user/domain/entities/user-session.entity.ts';
import type { SignInMethodsOfUser } from '@base/features/user/domain/entities/identity.entity.ts';
import type { IProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import type { IUserAdminServiceClient } from '@base/generated/scylla/accounts/v1/user_admin_service.client.ts';
import type { User } from '@base/generated/scylla/accounts/v1/user.ts';
import type { PasswordResetDelivery } from '@base/features/login';
import type { PaginatedList } from '@scylla/ui/structs';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import * as grpcUser from './grpc-user.mapper.ts';

/** The wrapped entity is optional on the wire: fail here rather than pass an empty user on. */
const requireUser = (user: User | undefined): UserEntity => {
  if (!user) throw new Error('Server returned a response without a user.');
  return grpcUser.toDomain(user);
};

const PAGE_SIZE = 100;

/**
 * The own account goes to `ProfileService`, which needs no right. Another user goes to
 * `UserAdminService`, for an admin of the instance.
 */
export class DefaultUserRepository implements UserRepository {
  constructor(
    private readonly profiles: IProfileServiceClient,
    private readonly admin: IUserAdminServiceClient,
    /** The id of the user of the session. */
    private readonly selfId: () => string | null,
  ) {}

  private isSelf(userId: string): boolean {
    return userId === this.selfId();
  }

  public async getAll(): Promise<PaginatedList<UserEntity>> {
    const users: User[] = [];
    let token = '';
    do {
      const response = await this.admin.listUsers({ query: '', page: { size: PAGE_SIZE, token } })
        .response;
      users.push(...response.users);
      token = response.page?.nextToken ?? '';
    } while (token);
    return grpcUser.toDomainList(users);
  }

  public async getById(userId: string): Promise<UserEntity> {
    if (this.isSelf(userId)) return this.getMe();
    const response = await this.admin.getUser({ userId: wrapId(userId) }).response;
    return requireUser(response.user);
  }

  public async getMe(): Promise<UserEntity> {
    const response = await this.profiles.getMe({}).response;
    return requireUser(response.user);
  }

  public async create(input: CreateUserInput): Promise<UserEntity> {
    const response = await this.admin.createUser(grpcUser.toCreateRequest(input)).response;
    return requireUser(response.user);
  }

  /** The own profile changes its name and handle only: a new email has its own flow. */
  public async update(input: UpdateUserInput): Promise<UserEntity> {
    if (this.isSelf(input.id) && input.email === undefined) {
      const response = await this.profiles.updateProfile({
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.username !== undefined && { handle: input.username }),
      }).response;
      return requireUser(response.user);
    }
    const response = await this.admin.updateUser(grpcUser.toUpdateRequest(input)).response;
    return requireUser(response.user);
  }

  public async delete(userId: string): Promise<void> {
    await this.admin.deleteUser({ userId: wrapId(userId) }).response;
  }

  public async setActive(userId: string, isActive: boolean): Promise<UserEntity> {
    const status = isActive ? 'active' : 'disabled';
    const response = await this.admin.setUserStatus({ userId: wrapId(userId), status }).response;
    return requireUser(response.user);
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.profiles.changePassword({ currentPassword, newPassword }).response;
  }

  public async sendPasswordReset(userId: string): Promise<PasswordResetDelivery> {
    await this.admin.sendPasswordReset({ userId: wrapId(userId) }).response;
    return 'unknown';
  }

  /** The server gives no count: the count is the sessions of the list before the revocation. */
  public async revokeSessions(userId: string): Promise<number> {
    const sessions = await this.listSessions(userId);
    if (this.isSelf(userId)) {
      await this.profiles.revokeOtherSessions({}).response;
      return sessions.filter(session => !session.current).length;
    }
    await this.admin.revokeUserSessions({ userId: wrapId(userId) }).response;
    return sessions.length;
  }

  public async deleteAccount(password: string): Promise<void> {
    await this.profiles.deleteAccount({ password }).response;
  }

  public async listSessions(userId: string): Promise<UserSessionEntity[]> {
    const { sessions } = this.isSelf(userId)
      ? await this.profiles.listSessions({}).response
      : await this.admin.listUserSessions({ userId: wrapId(userId) }).response;
    return sessions.map(grpcUser.sessionToDomain);
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    if (!this.isSelf(userId)) {
      throw new ScyllaError('one session of another user cannot be revoked', {
        code: 'UNIMPLEMENTED',
      });
    }
    await this.profiles.revokeSession({ sessionId: wrapId(sessionId) }).response;
  }

  public async requestEmailChange(newEmail: string, password: string): Promise<void> {
    await this.profiles.requestEmailChange({ newEmail, password }).response;
  }

  public async confirmEmailChange(token: string): Promise<UserEntity> {
    const response = await this.profiles.confirmEmailChange({ token }).response;
    return requireUser(response.user);
  }

  public async listSignInMethods(): Promise<SignInMethodsOfUser> {
    const response = await this.profiles.listIdentities({}).response;
    return {
      hasPassword: response.hasPassword,
      identities: response.identities.map(identity => ({
        provider: identity.provider,
        subject: identity.subject,
        email: identity.email,
        linkedAt: timestampToIso(identity.linkedAt),
      })),
    };
  }

  public async unlinkIdentity(provider: string, subject: string): Promise<void> {
    await this.profiles.unlinkIdentity({ provider, subject }).response;
  }

  public async setInstanceAdmin(userId: string, admin: boolean): Promise<void> {
    const request = { userId: wrapId(userId) };
    if (admin) await this.admin.grantInstanceAdmin(request).response;
    else await this.admin.revokeInstanceAdmin(request).response;
  }
}
