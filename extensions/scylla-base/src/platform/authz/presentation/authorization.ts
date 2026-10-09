import { contextStore } from '@platform/context';
import { permissionsStore } from '@platform/authz/presentation/stores/permissions.store.ts';
import { toRune } from '@scylla/ui/stores';
import type { Permission } from '@platform/authz/domain/structs/permission.struct.ts';
import {
  canAccess,
  type PermissionTarget,
} from '@platform/authz/domain/entities/effective-permissions.entity.ts';

/** A route's `permission` is a `Permission`: `can` below is the access policy of the core. */
declare module '@scylla/core-sdk' {
  interface Register {
    permission: Permission;
  }
}

const readPermissions = toRune(permissionsStore);
const readContext = toRune(contextStore);

/** Reactive in a `$derived`. Denies while the permissions are not loaded yet. */
export const can = (permission: Permission, target?: PermissionTarget): boolean => {
  const effective = readPermissions().permissions;
  if (!effective) return false;

  const { organization, project } = readContext();

  return canAccess(effective, permission, {
    organizationId: target?.organizationId ?? organization.id ?? undefined,
    projectId: target?.projectId ?? project.id ?? undefined,
  });
};

export const authorizationReady = (): boolean => readPermissions().permissions !== null;
