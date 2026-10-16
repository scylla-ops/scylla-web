import type { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type { ProjectList } from '@base/features/project/domain/structs/project.struct.ts';
import type { UserSummary } from '@base/features/user';
import type { PaginationParams } from '@scylla/ui/structs';

export interface ProjectRepository {
  getByOrganizationId: (
    organizationId: string,
    pagination?: PaginationParams,
  ) => Promise<ScyllaResult<ProjectList>>;
  listMembers: (projectId: string) => Promise<ScyllaResult<UserSummary[]>>;
  create: (
    name: string,
    organizationId: string,
    description?: string,
  ) => Promise<ScyllaResult<ProjectEntity>>;
  update: (
    projectId: string,
    name?: string,
    description?: string,
  ) => Promise<ScyllaResult<ProjectEntity>>;
  delete: (projectId: string) => Promise<ScyllaResult<void>>;
}
