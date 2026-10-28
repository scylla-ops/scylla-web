/** `UNSPECIFIED` also means a scope this build does not know. */
export enum PermissionScope {
  UNSPECIFIED = 0,
  SYSTEM = 1,
  ORGANIZATION = 2,
  PROJECT = 3,
}

/** The scope of one grant, as the lists of accesses of a user or an app show it. */
export type AccessScope = 'system' | 'organization' | 'project';

/**
 * True when `scope` is `other` or broader. Scopes go broad to narrow: SYSTEM, ORGANIZATION,
 * PROJECT. `UNSPECIFIED` covers nothing and nothing covers it.
 */
export const scopeCovers = (scope: PermissionScope, other: PermissionScope): boolean =>
  scope !== PermissionScope.UNSPECIFIED && other !== PermissionScope.UNSPECIFIED && scope <= other;
