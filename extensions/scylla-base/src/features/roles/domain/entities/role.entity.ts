export type RoleLevel = 'platform' | 'workspace' | 'project';

export type RoleHolder = 'people' | 'apps';

export interface RoleEntity {
  /** A fixed text for a built-in role, the id for a custom role. */
  key: string;
  name: string;
  description: string;
  level: RoleLevel;
  holder: RoleHolder;
  /** The name of the role in `Grant` and `Revoke`. */
  grantName: string;
  builtin: boolean;
  fullControl: boolean;
  permissions: string[];
  holderCount: number;
  /** The workspace that owns a custom role. */
  workspaceId?: string;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  level: RoleLevel;
  holder: RoleHolder;
  permissions: string[];
  workspaceId?: string;
}

export interface UpdateRoleInput {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}
