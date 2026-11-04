/** A workspace of the server. The rename of the code to `workspace` comes in its own change. */
export interface OrganizationEntity {
  id: string;
  name: string;
  /** Unique and editable: the first segment of the URLs of the workspace. */
  slug: string;
}
