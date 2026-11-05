<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { deleteTitle, holdersOnDelete, rolesMessages } from '../../messages/roles.messages.ts';
  import { roleName } from '../../role-labels.ts';
  import { roleMutations, roleQueries } from '../../roles.queries.ts';

  interface Props {
    role: RoleEntity;
    /** The workspace of the list of the page. */
    workspaceId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted: () => void;
  }

  let { role, workspaceId, open, onOpenChange, onDeleted }: Props = $props();

  const hasHolders = $derived(role.holderCount > 0);
  const holdersQuery = createQuery(() =>
    roleQueries.holders(role.key, workspaceId, { enabled: open && hasHolders }),
  );
  const rolesQuery = createQuery(() => roleQueries.list(workspaceId, { enabled: open }));
  const remove = createMutation(() => roleMutations.remove());

  /** The same level and the same holders. The role Instance admin is not a target. */
  const targets = $derived(
    (rolesQuery.data ?? []).filter(
      other =>
        other.key !== role.key &&
        other.level === role.level &&
        other.holder === role.holder &&
        other.key !== 'instance-admin',
    ),
  );

  let target = $state('');
  const chosen = $derived(targets.find(other => other.grantName === target));
  const names = $derived(
    [...new Set((holdersQuery.data?.holders ?? []).map(holder => holder.displayName))].slice(0, 8),
  );
  const canDelete = $derived(!hasHolders || chosen !== undefined);

  /** The list reloads first and unmounts the page: a callback of `mutate` would not run. */
  const confirm = async () => {
    try {
      await remove.mutateAsync({ id: role.key, ...(hasHolders ? { moveTo: target } : {}) });
      onDeleted();
    } catch {
      // The global mutation handler toasts the error. The dialog stays open.
    }
  };
</script>

<ScyllaDialog {open} {onOpenChange} title={t(deleteTitle(roleName(role)))}>
  <div class="flex flex-col gap-4">
    {#if hasHolders}
      <p class="text-sm text-muted-foreground">{t(holdersOnDelete(role.holderCount))}</p>
      <div class="flex flex-wrap gap-2">
        {#each names as name (name)}
          <span class="rounded-full bg-muted px-2.5 py-1 text-xs">{name}</span>
        {/each}
      </div>
      <div class="flex flex-col gap-2">
        <Label>{t(rolesMessages.moveHoldersTo)}</Label>
        <Select type="single" value={target} onValueChange={next => (target = next)}>
          <SelectTrigger class="w-full" aria-label={t(rolesMessages.moveHoldersTo)}>
            {chosen ? roleName(chosen) : t(rolesMessages.chooseRole)}
          </SelectTrigger>
          <SelectContent>
            {#each targets as other (other.key)}
              <SelectItem value={other.grantName} label={roleName(other)}>
                {roleName(other)}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">{t(rolesMessages.moveHoldersHint)}</p>
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">{t(rolesMessages.deleteHint)}</p>
    {/if}
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => onOpenChange(false)}>
        {t(rolesMessages.cancel)}
      </Button>
      <Button variant="destructive" disabled={!canDelete || remove.isPending} onclick={() => void confirm()}>
        {hasHolders ? t(rolesMessages.moveAndDelete) : t(rolesMessages.deleteRole)}
      </Button>
    </div>
  </div>
</ScyllaDialog>
