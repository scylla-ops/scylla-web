import type { Permission, PermissionScope } from '@platform/authz';

/** A permission and the narrowest scope where it applies. */
export interface PermissionAction {
  permission: Permission;
  /** Usable at this scope or a broader one. Scopes go broad to narrow, so broader-or-equal is `scope <= minScope`. */
  minScope: PermissionScope;
}

export interface PermissionVocabulary {
  actions: PermissionAction[];
}
