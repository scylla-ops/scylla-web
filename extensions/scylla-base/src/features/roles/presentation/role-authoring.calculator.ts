import {
  PermissionScope,
  type EffectivePermissionsEntity,
  type EffectiveScopeEntity,
  type Permission,
} from '@platform/authz';
import { carriedBy } from './utils/permission-mapping.ts';

/**
 * The backend's escalation rule (`ensure_no_escalation`): an author puts in a role only what it
 * holds through a grant at System, or at the organization that owns the role (`null` for a
 * platform role). A project grant never counts.
 */
const authoringScopes = (
  effective: EffectivePermissionsEntity | null,
  organizationId: string | null,
): EffectiveScopeEntity[] =>
  (effective?.scopes ?? []).filter(
    entry =>
      entry.scope === PermissionScope.SYSTEM ||
      (organizationId !== null &&
        entry.scope === PermissionScope.ORGANIZATION &&
        entry.scopeId === organizationId),
  );

export const holdsFullControl = (
  effective: EffectivePermissionsEntity | null,
  organizationId: string | null,
): boolean =>
  authoringScopes(effective, organizationId).some(entry => entry.access.kind === 'fullControl');

export const holdsPermission = (
  effective: EffectivePermissionsEntity | null,
  organizationId: string | null,
  permission: Permission,
): boolean =>
  authoringScopes(effective, organizationId).some(
    entry =>
      entry.access.kind === 'fullControl' ||
      (entry.access.kind === 'restricted' && entry.access.permissions.includes(permission)),
  );

/** The candidates the author may not tick at `scope`: a stand-in also needs what it carries. */
export const lockedPermissionsOf = (
  candidates: readonly Permission[],
  scope: PermissionScope,
  effective: EffectivePermissionsEntity | null,
  organizationId: string | null,
): Set<Permission> =>
  new Set(
    candidates.filter(
      candidate =>
        !carriedBy(scope, candidate).every(permission =>
          holdsPermission(effective, organizationId, permission),
        ),
    ),
  );
