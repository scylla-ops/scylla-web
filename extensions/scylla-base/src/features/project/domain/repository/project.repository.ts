import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { UserSummary } from '@base/features/user';
import type { PaginationParams } from '@scylla/ui/structs';

export interface ProjectRepository {
  getByOrganizationId: (
    organizationId: string,
    pagination?: PaginationParams,
  ) => Promise<ProjectList>;
  listMembers: (projectId: string) => Promise<UserSummary[]>;
  create: (name: string, organizationId: string, description?: string) => Promise<ProjectEntity>;
  update: (projectId: string, name?: string, description?: string) => Promise<ProjectEntity>;
  delete: (projectId: string) => Promise<void>;
}
