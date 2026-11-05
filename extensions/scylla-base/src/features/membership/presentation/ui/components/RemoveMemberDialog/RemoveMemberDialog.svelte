<script lang="ts">
  import { i18n } from '@lingui/core';
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { accessMutations, projectRef, workspaceRef } from '@base/features/access';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import { toast } from '@scylla/ui/utils';
  import { OWNER_KEY, type MemberRow } from '../../../presenters/member-rows.presenter.ts';
  import { memberRoleName } from '../../../presenters/member-role-name.ts';
  import {
    membershipMessages,
    needsWorkspaceRole,
    removedFrom,
    removeTitle,
  } from '../../../messages/membership.messages.ts';

  interface Props {
    row: MemberRow | null;
    workspaceId: string;
    workspaceName: string;
    onClose: () => void;
    onRemoved: () => void;
  }

  let { row, workspaceId, workspaceName, onClose, onRemoved }: Props = $props();

  const revoke = createMutation(() => accessMutations.revoke());
  let pending = $state(false);

  const canChangeOwners = $derived(can(Permission.MANAGE_OWNERS, { workspaceId }));
  const given = $derived(
    (row?.workspaceRoles ?? []).filter(role => role.roleKey !== OWNER_KEY || canChangeOwners),
  );
  const ownerStays = $derived(given.length < (row?.workspaceRoles.length ?? 0));

  /** The server takes the roles on the projects with the last role in the workspace. */
  const confirm = async () => {
    if (!row) return;
    pending = true;
    try {
      for (const role of row.projectRoles) {
        const object = projectRef(role.scopeId);
        await revoke.mutateAsync({ object, role: role.role, actorId: row.actorId });
      }
      for (const role of given) {
        const object = workspaceRef(workspaceId);
        await revoke.mutateAsync({ object, role: role.role, actorId: row.actorId });
      }
      toast.success(i18n._(removedFrom(row.name, workspaceName)));
      onRemoved();
      onClose();
    } catch {
      // The global mutation handler toasts the error.
    } finally {
      pending = false;
    }
  };
</script>

<ScyllaDialog
  open={row !== null}
  onOpenChange={open => {
    if (!open) onClose();
  }}
  title={row ? t(removeTitle(row.name, workspaceName)) : ''}
  description={t(membershipMessages.removeHint)}
>
  {#if row}
    <div class="flex flex-col gap-3">
      <div class="rounded-xl border p-3 text-sm">
        <span class="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs">{workspaceName}</span>
        {given.map(memberRoleName).join(', ')}
      </div>
      {#each row.projectRoles as role (`${role.scopeId}-${role.role}`)}
        <div class="rounded-xl border p-3 text-sm">
          <span class="mr-2 rounded-full bg-muted px-2 py-0.5 text-xs">{role.scopeName}</span>
          {memberRoleName(role)}
          <p class="mt-1 text-xs text-muted-foreground">{t(needsWorkspaceRole(workspaceName))}</p>
        </div>
      {/each}
      {#if ownerStays}
        <p class="text-xs text-muted-foreground">{t(membershipMessages.ownerStays)}</p>
      {/if}
      <div class="flex justify-end gap-2">
        <Button variant="outline" onclick={onClose}>{t(membershipMessages.cancel)}</Button>
        <Button variant="destructive" disabled={pending || given.length + row.projectRoles.length === 0} onclick={() => void confirm()}>
          {t(membershipMessages.removeFromWorkspaceAction)}
        </Button>
      </div>
    </div>
  {/if}
</ScyllaDialog>
