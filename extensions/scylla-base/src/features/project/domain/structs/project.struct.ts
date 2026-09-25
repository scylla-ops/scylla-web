import type { PaginationInfo } from '@scylla/ui/structs';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';

export interface ProjectList {
  projects: ProjectEntity[];
  pagination: PaginationInfo;
}
