<script lang="ts">
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { createMutation } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import type { CredentialRow } from '@base/features/apps/domain/structs/app-credentials.struct.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { credentialMutations } from '@base/features/apps/presentation/app-credentials.queries.ts';
  import { credentialLabels } from '@base/features/apps/presentation/presenters/credential-labels.presenter.ts';
  import { appPageMessages as messages } from '@base/features/apps/presentation/messages/app-page.messages.ts';

  interface Props {
    appId: string;
    rows: CredentialRow[];
    /** Absent: the user may not add one. */
    onAdd?: () => void;
    /** `create_app`: revoke and remove. */
    canManage: boolean;
  }

  let { appId, rows, onAdd, canManage }: Props = $props();

  const revokeToken = createMutation(() => credentialMutations.revokeToken(appId));
  const removeIdentity = createMutation(() => credentialMutations.removeCiIdentity(appId));
  const revokeKey = createMutation(() => appMutations.revokeKey());

  let ending = $state<CredentialRow | null>(null);
  const now = new Date();

  const ICON = { token: KeyRoundIcon, ci: GitBranchIcon, key: LockIcon } as const;

  const live = (row: CredentialRow) =>
    row.kind === 'token' ? row.state !== 'revoked' : row.kind === 'key' ? !row.key.revokedAt : true;

  const confirm = $derived.by(() => {
    if (!ending) return null;
    if (ending.kind === 'token') {
      return {
        title: t(messages.revokeTokenTitle(ending.token.name)),
        body: t(messages.revokeTokenBody),
        label: t(messages.revoke),
      };
    }
    if (ending.kind === 'ci') {
      return {
        title: t(messages.removeIdentityTitle),
        body: t(messages.removeIdentityBody),
        label: t(messages.remove),
      };
    }
    return { title: t(messages.revokeKeyTitle), body: t(messages.revokeKeyBody), label: t(messages.revoke) };
  });

  const end = () => {
    const row = ending;
    if (!row) return;
    const done = { onSuccess: () => (ending = null) };
    if (row.kind === 'token') revokeToken.mutate(row.id, done);
    else if (row.kind === 'ci') removeIdentity.mutate(row.id, done);
    else revokeKey.mutate({ appId, keyId: row.id }, done);
  };
</script>

<Card>
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.credentials)}</h2></CardTitle>
    {#if onAdd}
      <Button variant="outline" size="sm" onclick={onAdd}>
        <PlusIcon class="size-4" aria-hidden="true" />
        {t(messages.addCredential)}
      </Button>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-3">
    <div class="relative overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="px-6">{t(messages.credential)}</TableHead>
            <TableHead>{t(messages.details)}</TableHead>
            <TableHead>{t(messages.expiry)}</TableHead>
            <TableHead>{t(messages.lastUsedColumn)}</TableHead>
            <TableHead class="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each rows as row (`${row.kind}-${row.id}`)}
            {@const labels = credentialLabels(row, now)}
            {@const Icon = ICON[row.kind]}
            {@const state = row.kind === 'token' ? row.state : 'ok'}
            <TableRow class={live(row) ? '' : 'text-muted-foreground'}>
              <TableCell class="px-6 py-3">
                <span class="flex items-center gap-2 font-medium">
                  <Icon class="size-4" aria-hidden="true" />
                  {labels.name}
                </span>
                <span class="text-xs text-muted-foreground">{labels.kind}</span>
              </TableCell>
              <TableCell class="py-3">
                <span class="block font-mono text-xs">{labels.detail}</span>
                <span class="text-xs text-muted-foreground">{labels.sub}</span>
              </TableCell>
              <TableCell class="py-3">
                <span
                  class={cn(
                    'inline-flex items-center gap-1.5 text-xs',
                    state === 'soon' && 'text-warning',
                    (state === 'expired' || state === 'revoked') && 'text-destructive',
                    state === 'ok' && 'text-muted-foreground',
                  )}
                >
                  {#if row.kind === 'token'}
                    {#if state === 'expired' || state === 'revoked'}
                      <CircleXIcon class="size-3.5" aria-hidden="true" />
                    {:else}
                      <ClockIcon class="size-3.5" aria-hidden="true" />
                    {/if}
                  {/if}
                  {labels.expiry}
                </span>
              </TableCell>
              <TableCell class="py-3 text-xs">
                {row.lastUsedAt ? getRelativeTime(row.lastUsedAt) : t(messages.never)}
              </TableCell>
              <TableCell class="py-3 pr-4 text-right">
                {#if canManage && live(row)}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}
                    >
                      <EllipsisIcon class="size-4" aria-hidden="true" />
                      <span class="sr-only">{t(messages.actionsOf(labels.name))}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-40">
                      <DropdownMenuItem variant="destructive" onSelect={() => (ending = row)}>
                        <TrashIcon class="size-4" aria-hidden="true" />
                        {row.kind === 'ci' ? t(messages.remove) : t(messages.revoke)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                {/if}
              </TableCell>
            </TableRow>
          {:else}
            <TableRow class="hover:bg-transparent">
              <TableCell colspan={5} class="px-6 py-6 text-muted-foreground">
                {t(messages.noCredential)}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </table>
    </div>
    <p class="text-xs text-muted-foreground">{t(messages.credentialsHint)}</p>
  </CardContent>
</Card>

<ConfirmOperationAlertDialog
  open={!!ending}
  onOpenChange={open => {
    if (!open) ending = null;
  }}
  title={confirm?.title}
  description={confirm?.body}
  continueLabel={confirm?.label}
  isLoading={revokeToken.isPending || removeIdentity.isPending || revokeKey.isPending}
  onContinue={end}
/>
