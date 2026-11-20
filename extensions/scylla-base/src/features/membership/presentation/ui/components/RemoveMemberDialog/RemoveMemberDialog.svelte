<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { i18n } from '@lingui/core';
  import { can, Permission } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import {
    accessMutations,
    projectRef,
    workspaceRef,
    type MemberRoleEntity,
  } from '@base/features/access';
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
  import ScopeLabel from '../ScopeLabel.svelte';

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

{#snippet scopedRoles(kind: MemberRoleEntity['scopeKind'], scope: string, roles: string)}
  <div class="flex min-w-0 items-center gap-2">
    <ScopeLabel {kind} name={scope} />
    <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span>{roles}</span>
  </div>
{/snippet}

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
        {@render scopedRoles('workspace', workspaceName, given.map(memberRoleName).join(', '))}
      </div>
      {#each row.projectRoles as role (`${role.scopeId}-${role.role}`)}
        <div class="rounded-xl border p-3 text-sm">
          {@render scopedRoles('project', role.scopeName, memberRoleName(role))}
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
