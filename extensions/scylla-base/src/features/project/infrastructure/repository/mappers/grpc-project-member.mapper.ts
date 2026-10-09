import type { ProjectMember as GrpcProjectMember } from '@base/generated/scylla/project/v1/project.ts';
import type { UserSummary } from '@base/features/user';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

export class GrpcProjectMemberMapper {
  public static toDomain(member: GrpcProjectMember): UserSummary {
    return {
      userId: idValue(member.userId),
      username: member.username,
    };
  }
}
