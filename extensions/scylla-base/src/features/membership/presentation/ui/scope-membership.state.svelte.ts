import { i18n } from '@lingui/core';
import { PermissionScope } from '@platform/authz';
import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import {
  ACCESS_QUERY_KEY,
  accessMutations,
  accessQueries,
  projectRef,
  workspaceRef,
  type ObjectRef,
} from '@base/features/access';
import { toast } from '@scylla/ui/utils';
import type { MemberRole } from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import { membershipMessages } from '../messages/membership.messages.ts';

export interface ScopeMembershipOptions {
  scope: PermissionScope;
  scopeId: () => string | null;
  /** Reads the roles: `list_access` on the object. */
  canRead: () => boolean;
  /** Refreshes the member lists that another feature's query keys hold. */
  onMembershipChanged?: () => void;
}

/**
 * The roles on one object, and the operations that change who holds what. There is no member
 * RPC: admitting is `Grant`; removing is `Revoke` of each role on the object. `scopeId` and
 * `canRead` are getters: they load after the first render.
 */
export const createScopeMembership = ({
  scope,
  scopeId,
  canRead,
  onMembershipChanged,
}: ScopeMembershipOptions) => {
  const object = (): ObjectRef | null => {
    const id = scopeId();
    if (!id) return null;
    return scope === PermissionScope.PROJECT ? projectRef(id) : workspaceRef(id);
  };

  const accessQuery = createQuery(() => accessQueries.list(object(), { enabled: canRead() }));

  const grant = createMutation(() => accessMutations.grant());
  const revoke = createMutation(() => accessMutations.revoke());
  let removing = $state(false);

  /** One `Grant` per role. Returns whether all passed, so the form stays open on failure. */
  const grantRoles = async (userId: string, roleIds: string[]): Promise<boolean> => {
    const target = object();
    if (!target || roleIds.length === 0) return false;

    try {
      await Promise.all(
        roleIds.map(role => grant.mutateAsync({ object: target, role, actorId: userId })),
      );
      onMembershipChanged?.();
      return true;
    } catch {
      return false;
    }
  };

  const addRole = async (userId: string, roleId: string) => {
    if (await grantRoles(userId, [roleId])) {
      toast.success(i18n._(membershipMessages.roleGranted));
    }
  };

  const revokeRole = async (role: MemberRole) => {
    const target = object();
    if (!target) return;
    try {
      await revoke.mutateAsync({ object: target, role: role.roleId, actorId: role.userId });
      onMembershipChanged?.();
      toast.success(i18n._(membershipMessages.roleRevoked));
    } catch {
      // The global mutation handler toasts the error.
    }
  };

  /** Takes back each role of the user on this object. An owner stays an owner. */
  const removeMember = async (userId: string, username: string) => {
    const target = object();
    if (!target) return;
    const roles = (accessQuery.data ?? []).filter(
      entry => entry.actorId === userId && entry.role !== 'owner',
    );

    removing = true;
    try {
      for (const { role } of roles) {
        await revoke.mutateAsync({ object: target, role, actorId: userId });
      }
      onMembershipChanged?.();
      toast.success(i18n._(membershipMessages.memberRemoved(username, roles.length)));
    } catch {
      // The global mutation handler toasts the error.
    } finally {
      removing = false;
    }
  };

  /** After a change that this view model did not make. */
  const refresh = () => {
    onMembershipChanged?.();
    const target = object();
    if (!target) return;
    void getQueryClient().invalidateQueries({ queryKey: ACCESS_QUERY_KEY(target), exact: true });
  };

  return {
    get entries() {
      return accessQuery.data ?? [];
    },
    get isLoading() {
      return accessQuery.isLoading;
    },
    get isPending() {
      return grant.isPending || revoke.isPending || removing;
    },
    get isRemoving() {
      return removing;
    },
    grantRoles,
    addRole,
    revokeRole,
    removeMember,
    refresh,
  };
};

export type ScopeMembership = ReturnType<typeof createScopeMembership>;
