import type { ListUsersResponse, User } from '@base/generated/scylla/user/v1/user.ts';

import type { PaginationInfo, PaginatedList } from '@scylla/ui/structs';
import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
import { idValue, timestampToIso } from '@shared/infrastructure/grpc/wrappers.ts';

export class GrpcUserMapper {
  static toDomain(user: User): UserEntity {
    return {
      username: user.username,
      userId: idValue(user.userId),
      createdAt: timestampToIso(user.createdAt),
    };
  }

  static toDomainList(list: ListUsersResponse): PaginatedList<UserEntity> {
    return {
      items: list.users.map(GrpcUserMapper.toDomain),
      pagination: list.pagination as PaginationInfo,
    };
  }
}
