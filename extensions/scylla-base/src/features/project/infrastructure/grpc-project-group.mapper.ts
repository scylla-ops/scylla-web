import type { ProjectGroupEntity } from '@base/features/project/domain/entities/project-group.entity.ts';
import type { ProjectGroup } from '@base/generated/scylla/projects/v1/project_group.ts';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(group: ProjectGroup): ProjectGroupEntity {
  return {
    id: idValue(group.id),
    workspaceId: idValue(group.workspaceId),
    name: group.name,
  };
}
