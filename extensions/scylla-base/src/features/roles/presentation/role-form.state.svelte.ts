import {
  permissionsStore,
  PermissionScope,
  RoleKind,
  type AccessSpec,
  type Permission,
} from '@platform/authz';
import { createMutation } from '@scylla/core-sdk';
import { toRune } from '@scylla/ui/stores';
import type { RoleEntity } from '../domain/entities/role.entity.ts';
import { holdsFullControl, lockedPermissionsOf } from './role-authoring.calculator.ts';
import { roleMutations } from './roles.queries.ts';
import {
  ALL_SCOPES,
  getEditablePermissionDefinitionsForScope,
  getPermissionsForScope,
  isEditablePermission,
  isHiddenAtScope,
  withImplicitPermissions,
} from './utils/permission-mapping.ts';

export type AccessKind = 'fullControl' | 'restricted';

/** A role of an organization is never system scoped. */
const ORGANIZATION_ROLE_SCOPES: PermissionScope[] = [
  PermissionScope.ORGANIZATION,
  PermissionScope.PROJECT,
];

const readPermissions = toRune(permissionsStore);

/**
 * Creates or edits a role of `organizationId`, or a platform role when it is `null`. Seeded once:
 * the dialog rebuilds it at each opening. What the author does not hold is locked, as the
 * backend refuses it; a locked permission already in an edited role stays.
 */
export const createRoleForm = (role: RoleEntity | null, organizationId: string | null = null) => {
  const isEdit = role !== null;
  const initialScope = role?.scope ?? PermissionScope.ORGANIZATION;
  const scopes = organizationId === null ? ALL_SCOPES : ORGANIZATION_ROLE_SCOPES;

  let name = $state(role?.name ?? '');
  let description = $state(role?.description ?? '');
  let scope = $state<PermissionScope>(initialScope);
  let kind = $state<RoleKind>(role?.kind ?? RoleKind.MEMBER);
  let accessKind = $state<AccessKind>(
    role?.access.kind === 'fullControl' ? 'fullControl' : 'restricted',
  );

  /** The ticked boxes, without the hidden and preserved permissions (re-added on save). */
  let permissions = $state<Permission[]>(
    role?.access.kind === 'restricted'
      ? role.access.permissions.filter(
          permission =>
            isEditablePermission(permission) && !isHiddenAtScope(permission, initialScope),
        )
      : [],
  );

  /** Permissions this build's catalog does not show: kept on save, never deleted. */
  const preserved: Permission[] =
    role?.access.kind === 'restricted'
      ? role.access.permissions.filter(permission => !isEditablePermission(permission))
      : [];

  const createRole = createMutation(() => roleMutations.create());
  const updateRole = createMutation(() => roleMutations.update());

  /** The ticked boxes plus the implicit ones. */
  const conferred = $derived(withImplicitPermissions(scope, permissions));

  const lockedPermissions = $derived(
    lockedPermissionsOf(
      getEditablePermissionDefinitionsForScope(scope).map(definition => definition.id),
      scope,
      readPermissions().permissions,
      organizationId,
    ),
  );
  const canGiveFullControl = $derived(
    holdsFullControl(readPermissions().permissions, organizationId),
  );

  const buildAccess = (): AccessSpec =>
    accessKind === 'fullControl'
      ? { kind: 'fullControl' }
      : {
          // The implicit permissions never show in the editor: add them here.
          kind: 'restricted',
          // deduplication,
          // spread straight back into an array; the Set never outlives the expression.
          // eslint-disable-next-line svelte/prefer-svelte-reactivity
          permissions: [...new Set([...preserved, ...conferred])],
        };

  return {
    get isEdit() {
      return isEdit;
    },
    get name() {
      return name;
    },
    set name(next: string) {
      name = next;
    },
    get description() {
      return description;
    },
    set description(next: string) {
      description = next;
    },
    get scope() {
      return scope;
    },
    /** The scopes a role of this owner may have. */
    get scopes() {
      return scopes;
    },
    get isOrganizationRole() {
      return organizationId !== null;
    },
    get kind() {
      return kind;
    },
    /** Fixed once created: a role never changes between people and apps. */
    set kind(next: RoleKind) {
      if (!isEdit) kind = next;
    },
    get lockedPermissions() {
      return lockedPermissions;
    },
    get canGiveFullControl() {
      return canGiveFullControl;
    },
    get accessKind() {
      return accessKind;
    },
    set accessKind(next: AccessKind) {
      accessKind = next;
    },
    get permissions() {
      return permissions;
    },
    set permissions(next: Permission[]) {
      permissions = next;
    },
    get preservedCount() {
      return preserved.length;
    },
    get conferredCount() {
      return conferred.length;
    },
    get isPending() {
      return createRole.isPending || updateRole.isPending;
    },
    /** An organization role is never empty: it always carries what belonging means. */
    get isValid() {
      return (
        name.trim().length > 0 &&
        (accessKind === 'fullControl' || conferred.length + preserved.length > 0)
      );
    },
    /** Drops the permissions the new scope cannot confer, and the ones it now confers implicitly. */
    changeScope: (next: PermissionScope) => {
      scope = next;
      // a lookup local to
      // this handler, gone by the time it returns.
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const allowed = new Set(getPermissionsForScope(next) ?? []);
      permissions = permissions.filter(
        permission => allowed.has(permission) && !isHiddenAtScope(permission, next),
      );
    },
    /** Returns whether it was saved: the dialog closes on success and keeps the input on failure. */
    submit: async (): Promise<boolean> => {
      try {
        if (role) {
          await updateRole.mutateAsync({
            id: role.id,
            name: name.trim(),
            description: description.trim(),
            access: buildAccess(),
          });
        } else {
          await createRole.mutateAsync({
            name: name.trim(),
            description: description.trim(),
            scope,
            kind,
            ...(organizationId === null ? {} : { organizationId }),
            access: buildAccess(),
          });
        }
        return true;
      } catch {
        return false;
      }
    },
  };
};

export type RoleForm = ReturnType<typeof createRoleForm>;
