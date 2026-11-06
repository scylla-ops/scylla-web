import type {
  ProjectEntity,
  ProjectList,
} from '@base/features/project/domain/entities/project.entity.ts';
import type { PaginationParams } from '@scylla/ui/structs';

export interface ProjectRepository {
  /** `null`: the project does not exist, or this caller cannot read it. The server does not tell. */
  getById: (projectId: string) => Promise<ProjectEntity | null>;
  getByWorkspaceId: (workspaceId: string, pagination?: PaginationParams) => Promise<ProjectList>;
  create: (name: string, workspaceId: string, description?: string) => Promise<ProjectEntity>;
  update: (projectId: string, name?: string, description?: string) => Promise<ProjectEntity>;
  delete: (projectId: string) => Promise<void>;
}
