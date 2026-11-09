<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { createMutation } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, StatusShape } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Input,
    Label,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppKeyEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    agentId: string;
    keys: AppKeyEntity[];
    /** Absent: the user may not make a join code. */
    onNewCode?: () => void;
    /** `create_app`: rename and revoke. */
    canManage: boolean;
    /** The tour points here to run the agent when no connect card shows. */
    tourAnchor?: boolean;
  }

  let { agentId, keys, onNewCode, canManage, tourAnchor = false }: Props = $props();

  const rename = createMutation(() => appMutations.renameKey());
  const revoke = createMutation(() => appMutations.revokeKey());

  let renaming = $state<AppKeyEntity | null>(null);
  let label = $state('');
  let revoking = $state<AppKeyEntity | null>(null);

  const nameOf = (key: AppKeyEntity) => key.label || t(messages.unnamed);

  const phone = new MediaQuery('(max-width: 639px)');

  const startRename = (key: AppKeyEntity) => {
    label = key.label;
    renaming = key;
  };

  const submitRename = (event: SubmitEvent) => {
    event.preventDefault();
    if (!renaming || !label.trim()) return;
    rename.mutate(
      { appId: agentId, keyId: renaming.id, label },
      { onSuccess: () => (renaming = null) },
    );
  };
</script>

{#snippet keyMenu(key: AppKeyEntity)}
  <DropdownMenu>
    <DropdownMenuTrigger class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}>
      <EllipsisIcon class="size-4" aria-hidden="true" />
      <span class="sr-only">{t(messages.keyActions(nameOf(key)))}</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem onSelect={() => startRename(key)}>
        <PencilIcon class="size-4" aria-hidden="true" />
        {t(messages.rename)}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => (revoking = key)}>
        <TrashIcon class="size-4" aria-hidden="true" />
        {t(messages.revoke)}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{/snippet}

<Card data-tour={tourAnchor ? 'agent-run' : undefined}>
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.keys)}</h2></CardTitle>
    {#if onNewCode}
      <Button variant="outline" size="sm" onclick={onNewCode}>
        <KeyRoundIcon class="size-4" aria-hidden="true" />
        {t(messages.newJoinCode)}
      </Button>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-3">
    {#if phone.current}
      <ul class="flex flex-col gap-3">
        {#each keys as key (key.id)}
          <li class="flex items-start justify-between gap-2 text-sm">
            <div class={cn('min-w-0', key.revokedAt && 'text-muted-foreground')}>
              <p class="truncate">{nameOf(key)}</p>
              <p class="text-xs text-muted-foreground">
                <span class="font-mono">{key.id.slice(-10).toUpperCase()}</span> ·
                {key.revokedAt
                  ? t(messages.revokedOn(formatDay(key.revokedAt)))
                  : `${t(messages.active)} · ${formatDay(key.createdAt)}`}
              </p>
            </div>
            {#if canManage && !key.revokedAt}
              {@render keyMenu(key)}
            {/if}
          </li>
        {:else}
          <li class="text-sm text-muted-foreground">{t(messages.noKey)}</li>
        {/each}
      </ul>
    {:else}
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t(messages.keyName)}</TableHead>
            <TableHead>{t(messages.key)}</TableHead>
            <TableHead>{t(messages.added)}</TableHead>
            <TableHead>{t(messages.state)}</TableHead>
            <TableHead class="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each keys as key (key.id)}
            <TableRow class={key.revokedAt ? 'text-muted-foreground' : ''}>
              <TableCell>{nameOf(key)}</TableCell>
              <TableCell class="font-mono text-xs">{key.id.slice(-10).toUpperCase()}</TableCell>
              <TableCell>{formatDay(key.createdAt)}</TableCell>
              <TableCell>
                {@const keyState = key.revokedAt
                  ? t(messages.revokedOn(formatDay(key.revokedAt)))
                  : t(messages.active)}
                <span class="inline-flex items-center gap-1.5">
                  <StatusShape
                    state={key.revokedAt ? 'cancelled' : 'success'}
                    label={keyState}
                    size={20}
                  />
                  <span aria-hidden="true">{keyState}</span>
                </span>
              </TableCell>
              <TableCell class="text-right">
                {#if canManage && !key.revokedAt}
                  {@render keyMenu(key)}
                {/if}
              </TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={5} class="px-6 py-6 text-muted-foreground">
                {t(messages.noKey)}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </TableFrame>
    {/if}
    <p class="text-xs text-muted-foreground">{t(messages.keysHint)}</p>
  </CardContent>
</Card>

<Dialog
  open={!!renaming}
  onOpenChange={next => {
    if (!next) renaming = null;
  }}
>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t(messages.renameTitle)}</DialogTitle>
    </DialogHeader>
    <form id="rename-key" class="flex flex-col gap-1.5" onsubmit={submitRename}>
      <Label for="key-label">{t(messages.keyName)}</Label>
      <Input id="key-label" bind:value={label} autocomplete="off" />
      <p class="text-xs text-muted-foreground">{t(messages.renameHint)}</p>
    </form>
    <DialogFooter>
      <Button variant="outline" onclick={() => (renaming = null)}>{t(messages.cancel)}</Button>
      <Button type="submit" form="rename-key" disabled={!label.trim() || rename.isPending}>
        {t(messages.rename)}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<ConfirmOperationAlertDialog
  open={!!revoking}
  onOpenChange={next => {
    if (!next) revoking = null;
  }}
  title={t(messages.revokeTitle)}
  description={t(messages.revokeBody)}
  continueLabel={t(messages.revoke)}
  isLoading={revoke.isPending}
  onContinue={() => {
    if (revoking)
      revoke.mutate({ appId: agentId, keyId: revoking.id }, { onSuccess: () => (revoking = null) });
  }}
/>
