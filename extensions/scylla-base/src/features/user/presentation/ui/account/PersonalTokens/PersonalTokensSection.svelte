<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { contextStore } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog, ErrorState, ListSkeleton, StatusShape } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { expiryStateOf, type ApiToken } from '@shared/domain/structs/api-token.struct.ts';
  import {
    tokenExpiryShape,
    tokenExpiryText,
    tokenLimitsText,
  } from '@shared/presentation/presenters/token-labels.presenter.ts';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import {
    personalTokenMutations,
    personalTokenQueries,
  } from '@base/features/user/presentation/personal-tokens.queries.ts';
  import { personalTokensMessages as messages } from '@base/features/user/presentation/messages/personal-tokens.messages.ts';
  import NewPersonalTokenDialog from './NewPersonalTokenDialog.svelte';

  const phone = new MediaQuery('(max-width: 639px)');

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const workspaceName = $derived(context().workspace.name ?? '');

  const mine = createQuery(() => personalTokenQueries.mine());
  const revoke = createMutation(() => personalTokenMutations.revoke());

  let newOpen = $state(false);
  let revoking = $state<ApiToken | null>(null);

  const now = new Date();
  const enabled = $derived(mine.data?.enabled ?? true);
  const refusedHere = $derived(mine.data?.refusedWorkspaceIds.includes(workspaceId) ?? false);
</script>

{#snippet tokenMenu(token: ApiToken)}
  <DropdownMenu>
    <DropdownMenuTrigger
      class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 rounded-full')}
    >
      <EllipsisIcon class="size-4" aria-hidden="true" />
      <span class="sr-only">{t(messages.actionsOf(token.name))}</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuItem variant="destructive" onSelect={() => (revoking = token)}>
        <TrashIcon class="size-4" aria-hidden="true" />
        {t(messages.revoke)}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
{/snippet}

{#snippet expiry(token: ApiToken)}
  {@const state = expiryStateOf(token, now)}
  {#if !enabled}
    <span class="text-muted-foreground">{t(messages.turnedOff)}</span>
  {:else}
    <span
      class={cn(
        'flex items-center gap-2',
        state === 'soon' && 'text-warning',
        (state === 'expired' || state === 'revoked') && 'text-destructive',
      )}
    >
      <StatusShape
        state={tokenExpiryShape(state)}
        label={tokenExpiryText(token, state, now)}
        size={18}
      />
      <span aria-hidden="true">{tokenExpiryText(token, state, now)}</span>
    </span>
  {/if}
{/snippet}

<section class="flex flex-col gap-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-xl">{t(messages.title)}</h2>
      <p class="text-sm text-muted-foreground">{t(messages.description)}</p>
    </div>
    {#if enabled && mine.data}
      <Button onclick={() => (newOpen = true)}>
        <PlusIcon class="size-4" aria-hidden="true" />
        {t(messages.newToken)}
      </Button>
    {/if}
  </div>

  {#if !enabled}
    <div
      class="flex items-center gap-3 rounded-lg border border-warning/60 bg-warning/10 p-3"
      role="status"
    >
      <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium">{t(messages.offServerTitle)}</p>
        <p class="text-xs text-muted-foreground">{t(messages.offServerBody)}</p>
      </div>
    </div>
  {:else if refusedHere}
    <div
      class="flex items-center gap-3 rounded-lg border border-warning/60 bg-warning/10 p-3"
      role="status"
    >
      <TriangleAlertIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p class="text-sm font-medium">{t(messages.offWorkspaceTitle)}</p>
        <p class="text-xs text-muted-foreground">{t(messages.offWorkspaceBody(workspaceName))}</p>
      </div>
    </div>
  {/if}

  {#if mine.isError}
    <ErrorState message={mine.error?.message} />
  {:else if mine.isPending}
    <ListSkeleton rows={3} rowClass="h-14 w-full rounded-xl" />
  {:else if mine.data.tokens.length === 0}
    <p class="rounded-xl border p-6 text-center text-sm text-muted-foreground">
      {t(messages.empty)}
    </p>
  {:else if phone.current}
    <div class="flex flex-col gap-3">
      {#each mine.data.tokens as token (token.id)}
        <article class="flex flex-col gap-2 rounded-xl border p-4 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="min-w-0 truncate text-sm font-medium">{token.name}</span>
            {#if expiryStateOf(token, now) !== 'revoked'}
              {@render tokenMenu(token)}
            {/if}
          </div>
          <span>{tokenLimitsText(token.limits)}</span>
          {@render expiry(token)}
          <span class="text-muted-foreground">
            {t(messages.columnLastUsed)}:
            {token.lastUsedAt ? getRelativeTime(token.lastUsedAt) : t(messages.never)}
          </span>
        </article>
      {/each}
    </div>
    <p class="text-xs text-muted-foreground">{t(messages.hint)}</p>
  {:else}
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t(messages.columnToken)}</TableHead>
            <TableHead>{t(messages.columnLimits)}</TableHead>
            <TableHead>{t(messages.columnExpiry)}</TableHead>
            <TableHead>{t(messages.columnLastUsed)}</TableHead>
            <TableHead class="w-12">
              <span class="sr-only">{t(messages.columnActions)}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each mine.data.tokens as token (token.id)}
            {@const state = expiryStateOf(token, now)}
            <TableRow>
              <TableCell>
                <span class="block font-medium">{token.name}</span>
                <span class="block font-mono text-xs text-muted-foreground">{token.hint}</span>
              </TableCell>
              <TableCell class="text-xs">{tokenLimitsText(token.limits)}</TableCell>
              <TableCell class="text-xs">
                {@render expiry(token)}
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {token.lastUsedAt ? getRelativeTime(token.lastUsedAt) : t(messages.never)}
              </TableCell>
              <TableCell class="text-right">
                {#if state !== 'revoked'}
                  {@render tokenMenu(token)}
                {/if}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </TableFrame>
    <p class="text-xs text-muted-foreground">{t(messages.hint)}</p>
  {/if}
</section>

<NewPersonalTokenDialog open={newOpen} setOpen={open => (newOpen = open)} {workspaceId} />

<ConfirmOperationAlertDialog
  open={!!revoking}
  onOpenChange={open => {
    if (!open) revoking = null;
  }}
  title={t(messages.revokeTitle(revoking?.name ?? ''))}
  description={t(messages.revokeBody)}
  continueLabel={t(messages.revoke)}
  isLoading={revoke.isPending}
  onContinue={() => {
    if (revoking) revoke.mutate(revoking.id, { onSuccess: () => (revoking = null) });
  }}
/>
