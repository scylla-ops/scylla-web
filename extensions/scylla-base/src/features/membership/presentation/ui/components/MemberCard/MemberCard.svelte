<script lang="ts">
  import { Card } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { UserSummary } from '@base/features/user';
  import { UserIdentity, type MissingUser } from '@shared/presentation/ui';
  import type { MemberRole } from '../../../../domain/structs/scope-member.struct.ts';
  import type { AssignableRole } from '../../../assignable-roles.state.svelte.ts';
  import AddRoleSelect from '../AddRoleSelect/AddRoleSelect.svelte';
  import MemberRoleBadges from '../MemberRoleBadges/MemberRoleBadges.svelte';
  import MemberRowAction from '../MemberRowAction/MemberRowAction.svelte';
  import { membershipMessages } from '../../membership.messages.ts';

  interface Props {
    /** `undefined`: a missing user, named after `missing`. */
    user: UserSummary | undefined;
    missing?: MissingUser;
    roles: MemberRole[];
    isCurrentUser: boolean;
    canRemove: boolean;
    addableRoles: AssignableRole[];
    organizationName: string;
    onAddRole: (roleId: string) => void;
    labelFor: (roleId: string) => string;
    canManage: boolean;
    disabled: boolean;
    onRevokeRole: (role: MemberRole) => void;
    emptyRoles?: string;
    removeTooltip: string;
    onRemove: () => void;
  }

  let {
    user,
    missing = 'deleted',
    roles,
    isCurrentUser,
    canRemove,
    addableRoles,
    organizationName,
    onAddRole,
    labelFor,
    canManage,
    disabled,
    onRevokeRole,
    emptyRoles,
    removeTooltip,
    onRemove,
  }: Props = $props();
</script>

<!-- The roles band has a fixed height and scrolls, so every card has the same height. -->
<Card class="gap-0 overflow-hidden py-0">
  <div class="flex items-center gap-3 px-4 py-3.5">
    <UserIdentity {user} {missing} class="flex-1" />
    <!-- The count tells when there are more roles than the band shows. -->
    <span class="shrink-0 text-xs text-muted-foreground">
      {t(membershipMessages.roleCount(roles.length))}
    </span>
    <span class="shrink-0">
      <MemberRowAction
        {isCurrentUser}
        {canRemove}
        {disabled}
        tooltip={removeTooltip}
        {onRemove}
      />
    </span>
  </div>

  <div class="h-28 overflow-y-auto border-t border-border/70 px-4 py-3">
    <MemberRoleBadges
      {roles}
      {labelFor}
      {canManage}
      {disabled}
      onRevoke={onRevokeRole}
      empty={emptyRoles}
    />
  </div>

  {#if canManage}
    <!-- A constant height, so every card has the same size. -->
    <div
      class="flex min-h-11 items-center border-t border-border/70 bg-muted/30 px-4 py-2"
    >
      <AddRoleSelect {disabled} roles={addableRoles} {organizationName} onSelect={onAddRole} />
    </div>
  {/if}
</Card>
