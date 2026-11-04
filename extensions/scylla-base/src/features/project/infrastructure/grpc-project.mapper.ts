import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { Project } from '@base/generated/scylla/projects/v1/project.ts';
import type { PaginationParams } from '@scylla/ui/structs';
import { idValue } from '@shared/infrastructure/grpc/wrappers.ts';

export function toDomain(grpcProject: Project): ProjectEntity {
  return {
    id: idValue(grpcProject.id),
    name: grpcProject.name,
    description: grpcProject.description,
  };
}

/**
 * One page of the whole list. The server pages with tokens and has no count: the list is read
 * whole, then cut here, so that the page numbers of the UI stay.
 */
export function toDomainPage(projects: Project[], { page, pageSize }: PaginationParams): ProjectList {
  const totalPages = Math.max(1, Math.ceil(projects.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: projects.slice(start, start + pageSize).map(toDomain),
    pagination: {
      totalCount: projects.length,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
