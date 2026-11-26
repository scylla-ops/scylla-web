import type { ProjectEntity } from '@base/features/project/domain/entities/project.entity.ts';
import type {
  MoveProjectInput,
  ProjectGroupEntity,
} from '@base/features/project/domain/entities/project-group.entity.ts';

export interface ProjectGroupRepository {
  /** Each group of the workspace, in their order. */
  list: (workspaceId: string) => Promise<ProjectGroupEntity[]>;
  /** The new group comes after the other groups. */
  create: (workspaceId: string, name: string) => Promise<ProjectGroupEntity>;
  rename: (groupId: string, name: string) => Promise<ProjectGroupEntity>;
  /** `position` is the new place in the order of the groups, from 0. */
  reorder: (groupId: string, position: number) => Promise<ProjectGroupEntity>;
  /** The projects of the group come after the projects with no group. */
  delete: (groupId: string) => Promise<void>;
  move: (input: MoveProjectInput) => Promise<ProjectEntity>;
}
