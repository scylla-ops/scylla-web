/**
 * A group of the projects of a workspace. The members of the workspace share the groups, their
 * order and the order of the projects in each group.
 */
export interface ProjectGroupEntity {
  id: string;
  workspaceId: string;
  name: string;
}

/** A move of a project to a group and to a place there. */
export interface MoveProjectInput {
  id: string;
  /** The group after the move. Unset: no group. */
  groupId?: string;
  /** The project that comes just after the moved project. Unset: the moved project goes last. */
  beforeId?: string;
}
