import { createMutation } from '@scylla/core-sdk';
import type { GrantEntity } from '../domain/entities/grant.entity.ts';
import type { RoleEntity } from '../domain/entities/role.entity.ts';
import { grantMutations } from './roles.queries.ts';

export interface RoleAssignee {
  grant: GrantEntity;
  /** The username, or the principal id. */
  label: string;
}

/**
 * Who holds a role among the grants the page already read, and revoking it. Creating grants is
 * the grant dialog's job.
 */
export const createRoleAssignees = (
  role: () => RoleEntity,
  grants: () => GrantEntity[],
  labelOf: (grant: GrantEntity) => string,
) => {
  const revokeGrant = createMutation(() => grantMutations.revoke());

  const assignees = $derived(
    grants()
      .filter(grant => grant.roleId === role().id)
      .map((grant): RoleAssignee => ({ grant, label: labelOf(grant) })),
  );

  return {
    get assignees() {
      return assignees;
    },
    get isRemoving() {
      return revokeGrant.isPending;
    },
    remove: (grantId: string) => revokeGrant.mutate(grantId),
  };
};

export type RoleAssignees = ReturnType<typeof createRoleAssignees>;
