import type { OrganizationMember as GrpcOrganizationMember } from '@base/generated/scylla/organization/v1/organization.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';
import type { UserSummary } from '@base/features/user';

export class GrpcOrganizationMemberMapper {
  public static toDomain(member: GrpcOrganizationMember): UserSummary {
    return {
      userId: idValue(member.userId),
      username: member.username,
    };
  }
}
