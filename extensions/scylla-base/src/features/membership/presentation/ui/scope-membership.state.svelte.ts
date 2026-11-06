import { i18n } from '@lingui/core';
import { PrincipalKind, type PermissionScope } from '@platform/authz';
import { createMutation, createQuery, getQueryClient } from '@scylla/core-sdk';
import { GRANTS_QUERY_KEY, grantMutations, roleQueries } from '@base/features/roles';
import { toast } from '@scylla/ui/utils';
import type {
  MemberRole,
  ScopeMember,
} from '@base/features/membership/presentation/presenters/scope-members.presenter.ts';
import { membershipMessages } from '../messages/membership.messages.ts';

/** The member a page is about to remove, named for the confirmation. */
export interface PendingRemoval {
  userId: string;
  name: string;
}

export interface ScopeMembershipOptions {
  scope: PermissionScope;
  scopeId: () => string | null;
  canManage: () => boolean;
  /** The name of a member, for the confirmation of a removal and its toast. */
  nameOf: (userId: string) => string;
  /** Refreshes the backend's member list, which another feature's query key holds. */
  onMembershipChanged?: () => void;
}

/**
 * The grants of one scope, the operations that change who holds what, and the two dialogs of
 * a members page: the add dialog (`addOpen`) and the removal to confirm (`pendingRemoval`).
 * There is no member RPC: admitting is granting a role; removing is `RevokeAllAccess` at the
 * scope and beneath it. `scopeId` and `canManage` are getters: they load after the first render.
 */
export const createScopeMembership = ({
  scope,
  scopeId,
  canManage,
  nameOf,
  onMembershipChanged,
}: ScopeMembershipOptions) => {
  let addOpen = $state(false);
  let pendingRemoval = $state<PendingRemoval | null>(null);

  const grantsQuery = createQuery(() =>
    roleQueries.scopedGrants(scope, scopeId(), { enabled: canManage() }),
  );

  const createGrant = createMutation(() => grantMutations.create());
  const revokeGrant = createMutation(() => grantMutations.revoke());
  const revokeAllAccess = createMutation(() => grantMutations.revokeAllAccess());

  /** One grant per role. Returns whether all were created, so the form stays open on failure. */
  const grantRoles = async (userId: string, roleIds: string[]): Promise<boolean> => {
    const currentScopeId = scopeId();
    if (!currentScopeId || roleIds.length === 0) return false;

    try {
      await Promise.all(
        roleIds.map(roleId =>
          createGrant.mutateAsync({
            principal: { kind: PrincipalKind.USER, id: userId },
            roleId,
            scope,
            scopeId: currentScopeId,
          }),
        ),
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
    try {
      await revokeGrant.mutateAsync(role.grantId);
      onMembershipChanged?.();
      toast.success(i18n._(membershipMessages.roleRevoked));
    } catch {
      // The global mutation handler toasts the error.
    }
  };

  const removeMember = async (userId: string, username: string) => {
    const currentScopeId = scopeId();
    if (!currentScopeId) return;

    try {
      const revoked = await revokeAllAccess.mutateAsync({
        principal: { kind: PrincipalKind.USER, id: userId },
        scope,
        scopeId: currentScopeId,
      });
      onMembershipChanged?.();
      toast.success(i18n._(membershipMessages.memberRemoved(username, revoked)));
    } catch {
      // The global mutation handler toasts the error.
    }
  };

  /** The add dialog: every role granted, and a toast. `false` keeps the form open. */
  const addMember = async (userId: string, roleIds: string[]): Promise<boolean> => {
    const granted = await grantRoles(userId, roleIds);
    if (granted) toast.success(i18n._(membershipMessages.memberAdded(roleIds.length)));
    return granted;
  };

  const requestRemoval = (member: ScopeMember) => {
    pendingRemoval = { userId: member.userId, name: nameOf(member.userId) };
  };

  const cancelRemoval = () => {
    pendingRemoval = null;
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    await removeMember(pendingRemoval.userId, pendingRemoval.name);
    pendingRemoval = null;
  };

  /** After a change that this view model did not make. */
  const refresh = () => {
    onMembershipChanged?.();
    const currentScopeId = scopeId();
    if (!currentScopeId) return;
    void getQueryClient().invalidateQueries({
      queryKey: GRANTS_QUERY_KEY(scope, currentScopeId),
      exact: true,
    });
  };

  return {
    get grants() {
      return grantsQuery.data ?? [];
    },
    get isLoading() {
      return grantsQuery.isLoading;
    },
    get isPending() {
      return createGrant.isPending || revokeGrant.isPending || revokeAllAccess.isPending;
    },
    get isRemoving() {
      return revokeAllAccess.isPending;
    },
    get addOpen() {
      return addOpen;
    },
    set addOpen(value: boolean) {
      addOpen = value;
    },
    get pendingRemoval() {
      return pendingRemoval;
    },
    addMember,
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
    grantRoles,
    addRole,
    revokeRole,
    removeMember,
    refresh,
  };
};

export type ScopeMembership = ReturnType<typeof createScopeMembership>;
