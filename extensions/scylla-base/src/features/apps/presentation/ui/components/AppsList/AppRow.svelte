<script lang="ts">
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { createQuery } from '@scylla/core-sdk';
  import { Badge, TableCell, TableRow } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { roleLabel } from '@base/features/access';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    credentialRows,
    lastUsedOf,
  } from '@base/features/apps/domain/structs/app-credentials.struct.ts';
  import {
    mainCredential,
    type HeldRole,
  } from '@base/features/apps/domain/structs/app-list.struct.ts';
  import { credentialQueries } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import { credentialSummary } from '@base/features/apps/presentation/presenters/credential-labels.presenter.ts';
  import { appsListMessages as messages } from '@base/features/apps/presentation/messages/apps-list.messages.ts';
  import AppRowMenu from '../AppRowMenu/AppRowMenu.svelte';

  interface Props {
    app: AppEntity;
    /** `undefined`: the user may not read the roles, so there is no such column. */
    roles?: readonly HeldRole[];
    showRoles: boolean;
    canReadApp: boolean;
    onOpen: () => void;
    onDisable?: () => void;
    onEnable?: () => void;
    onDelete?: () => void;
  }

  let { app, roles, showRoles, canReadApp, onOpen, onDisable, onEnable, onDelete }: Props = $props();

  const ICONS = { token: KeyRoundIcon, ci: GitBranchIcon, key: LockIcon } as const;

  const credentials = createQuery(() => credentialQueries.allOf(app.id, canReadApp));

  const now = new Date();
  const rows = $derived(
    credentials.data
      ? credentialRows(
          credentials.data.tokens,
          credentials.data.identities,
          credentials.data.keys,
          now,
        )
      : [],
  );
  const main = $derived(mainCredential(rows));
  const summary = $derived(main ? credentialSummary(main.row, now) : null);
  const lastUsed = $derived(lastUsedOf(rows));
  const [firstRole, ...otherRoles] = $derived(
    (roles ?? []).map(role => t(messages.roleOn(roleLabel(role.role), role.on))),
  );
</script>

<TableRow>
  <TableCell class="px-6 py-3">
    <span class="flex items-center gap-2">
      <button type="button" class="font-mono font-medium hover:underline" onclick={onOpen}>
        {app.name}
      </button>
      {#if app.disabledAt}
        <Badge variant="outline">{t(messages.disabled)}</Badge>
      {/if}
    </span>
  </TableCell>
  <TableCell class="py-3">
    {#if main && summary}
      {@const Icon = ICONS[main.row.kind]}
      <span
        class={cn(
          'flex items-center gap-2 text-xs',
          summary.tone === 'warning' && 'text-warning',
          summary.tone === 'danger' && 'text-destructive',
        )}
      >
        <Icon class="size-4 shrink-0" aria-hidden="true" />
        <span>{summary.text}</span>
        {#if main.others > 0}
          <span class="text-muted-foreground">+{main.others}</span>
        {/if}
      </span>
    {:else if credentials.data}
      <span class="text-xs text-muted-foreground">{t(messages.noCredential)}</span>
    {:else if credentials.isPending === false}
      <span class="text-muted-foreground">–</span>
    {/if}
  </TableCell>
  {#if showRoles}
    <TableCell class="py-3" title={[firstRole, ...otherRoles].filter(Boolean).join(', ')}>
      {#if firstRole}
        {firstRole}
        {#if otherRoles.length > 0}
          <span class="text-xs text-muted-foreground">+{otherRoles.length}</span>
        {/if}
      {:else if roles}
        <span class="text-muted-foreground">{t(messages.noRole)}</span>
      {/if}
    </TableCell>
  {/if}
  <TableCell class="py-3 text-xs text-muted-foreground">
    {#if lastUsed}
      {getRelativeTime(lastUsed.lastUsedAt)}
    {:else if credentials.data}
      {t(messages.never)}
    {:else if credentials.isPending === false}
      –
    {/if}
  </TableCell>
  <TableCell class="py-3 pr-4 text-right">
    <AppRowMenu {app} openLabel={t(messages.openApp)} {onOpen} {onDisable} {onEnable} {onDelete} />
  </TableCell>
</TableRow>
