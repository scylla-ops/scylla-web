/** A workspace of the server. The rename of the code to `workspace` comes in its own change. */
export interface WorkspaceEntity {
  id: string;
  name: string;
  /** Unique and editable: the first segment of the URLs of the workspace. */
  slug: string;
  /** False: this workspace refuses the personal tokens of its members. */
  personalTokensEnabled: boolean;
}
