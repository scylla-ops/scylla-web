import type { OrganizationMember as GrpcOrganizationMember } from '@base/generated/scylla/organization/v1/organization.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { UserEntity } from '@base/features/user';

export class GrpcOrganizationMemberMapper {
  public static toDomain(member: GrpcOrganizationMember): UserEntity {
    return {
      userId: idValue(member.userId),
      username: member.username,
    };
  }
}
