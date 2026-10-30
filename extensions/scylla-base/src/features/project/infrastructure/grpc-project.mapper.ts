import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type {
  ListOrganizationProjectsResponse,
  Project,
} from '@base/generated/scylla/project/v1/project.ts';
import type { PaginationInfo } from '@scylla/ui/structs';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(grpcProject: Project): ProjectEntity {
  return {
    id: idValue(grpcProject.projectId),
    name: grpcProject.name,
    description: grpcProject.description,
  };
}

export function toDomainList(grpcProjects: ListOrganizationProjectsResponse): ProjectList {
  return {
    items: grpcProjects.projects.map(toDomain),
    pagination: grpcProjects.pagination as PaginationInfo,
  };
}
