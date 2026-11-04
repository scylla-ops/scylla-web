/** A workspace of the server. The rename of the code to `workspace` comes in its own change. */
export interface WorkspaceEntity {
  id: string;
  name: string;
  /** Unique and editable: the first segment of the URLs of the workspace. */
  slug: string;
}

/** An owner of a workspace: it can delete it and change its owners. No role gives that. */
export interface WorkspaceOwner {
  userId: string;
  displayName: string;
  since: string;
}
