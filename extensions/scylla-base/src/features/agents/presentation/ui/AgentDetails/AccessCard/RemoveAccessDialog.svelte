<script lang="ts">
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    Button,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AgentAccess } from '@base/features/agents/presentation/agent-access.state.svelte.ts';
  import AlertDialogCloseButton from '../../components/AlertDialogCloseButton.svelte';
  import DialogFooterBand from '../../components/DialogFooterBand.svelte';
  import { accessCardMessages as messages } from './access-card.messages.ts';
  import { GRANT_ICONS } from './grant-icons.ts';

  interface Props {
    manager: AgentAccess;
    agentName: string;
  }

  let { manager, agentName }: Props = $props();

  const removing = $derived(manager.removing);
  const title = $derived.by(() => {
    if (!removing) return '';
    return removing.scope === 'project'
      ? t(messages.removeTitle(manager.nameOf(removing)))
      : t(messages.removeOrganizationTitle(removing.organizationName));
  });
  const body = $derived.by(() => {
    if (!removing) return '';
    return removing.scope === 'project'
      ? t(messages.removeBody(agentName, manager.nameOf(removing)))
      : t(messages.removeOrganizationBody(agentName, removing.organizationName));
  });
</script>

<AlertDialog
  open={removing !== null}
  onOpenChange={open => {
    if (!open) manager.cancelRemove();
  }}
>
  <AlertDialogContent
    class="gap-0 overflow-hidden p-0 sm:max-w-[520px]"
    onCloseAutoFocus={manager.returnFocus}
  >
    <AlertDialogCloseButton onclick={manager.cancelRemove} disabled={manager.working} />
    <div data-dialog-part="header" class="flex flex-col gap-2 px-6 pt-6 pr-12">
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{body}</AlertDialogDescription>
    </div>
    <div data-dialog-part="body" class="flex flex-col gap-3 px-6 py-5">
      <ul aria-label={t(messages.whatChanges)} class="divide-y overflow-hidden rounded-lg border">
        {#each manager.removalGrants as grant (grant.grantId)}
          {@const Icon = GRANT_ICONS[grant.scope]}
          {@const loses = grant.grantId === removing?.grantId}
          <li class={cn('flex items-center gap-3 px-3 py-2.5', loses && 'bg-destructive/5')}>
            <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate text-sm">{manager.nameOf(grant)}</span>
            <span
              class={cn('text-xs font-medium', loses ? 'text-destructive' : 'text-muted-foreground')}
            >
              {loses ? t(messages.loses) : t(messages.keeps)}
            </span>
          </li>
        {/each}
      </ul>
      <p class="text-sm text-muted-foreground">
        {manager.removalStrandsJobs
          ? t(messages.reconnectStrandsJobs)
          : t(messages.reconnectKeepsJobs)}
        {#if manager.removesLastAccess}{t(messages.lastAccess)}{/if}
      </p>
    </div>
    <DialogFooterBand>
      <AlertDialogCancel class="mt-0" onclick={manager.cancelRemove} disabled={manager.working}>
        {t(messages.cancel)}
      </AlertDialogCancel>
      <Button
        variant="destructive"
        onclick={() => void manager.confirmRemove()}
        disabled={manager.working}
      >
        {t(messages.remove)}
      </Button>
    </DialogFooterBand>
  </AlertDialogContent>
</AlertDialog>
