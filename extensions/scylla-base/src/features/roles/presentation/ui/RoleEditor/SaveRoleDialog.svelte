<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import type { CatalogArea } from '../../../domain/structs/catalog.struct.ts';
  import {
    holdersOnSave,
    permissionLabel,
    rolesMessages,
    saveForHolders,
    saveTitle,
  } from '../../messages/roles.messages.ts';
  import { roleName } from '../../role-labels.ts';

  interface Props {
    role: RoleEntity;
    next: ReadonlySet<string>;
    areas: readonly CatalogArea[];
    open: boolean;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }

  let { role, next, areas, open, pending, onOpenChange, onConfirm }: Props = $props();

  const before = $derived(new Set(role.permissions));
  const added = $derived([...next].filter(id => !before.has(id)));
  const removed = $derived(role.permissions.filter(id => !next.has(id)));
  const scopeHint = $derived(
    role.level === 'project' ? rolesMessages.inTheProject : rolesMessages.inEveryProject,
  );
</script>

<ScyllaDialog {open} {onOpenChange} title={t(saveTitle(roleName(role)))}>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-muted-foreground">{t(holdersOnSave(role.holderCount))}</p>
    <ul class="flex flex-col gap-2 text-sm">
      {#each added as id (id)}
        <li class="flex items-center justify-between gap-4">
          <span>
            <span class="mr-2 text-primary" aria-hidden="true">+</span>
            {permissionLabel(id, areas)}
          </span>
          <span class="text-xs text-muted-foreground">{t(scopeHint)}</span>
        </li>
      {/each}
      {#each removed as id (id)}
        <li class="flex items-center justify-between gap-4">
          <span>
            <span class="mr-2 text-destructive" aria-hidden="true">−</span>
            {permissionLabel(id, areas)}
          </span>
          <span class="text-xs text-muted-foreground">{t(scopeHint)}</span>
        </li>
      {/each}
    </ul>
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => onOpenChange(false)}>
        {t(rolesMessages.cancel)}
      </Button>
      <Button disabled={pending} onclick={onConfirm}>
        {t(saveForHolders(role.holderCount))}
      </Button>
    </div>
  </div>
</ScyllaDialog>
