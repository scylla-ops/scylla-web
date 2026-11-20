<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PlusIcon from '@lucide/svelte/icons/plus';
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
  import { t } from '@scylla/ui/i18n';
  import { tokenExpiryShape } from '@shared/presentation/presenters/token-labels.presenter.ts';
  import { cn } from '@scylla/ui/utils';
  import { getRelativeTime } from '@shared/utils/date-utils.ts';
  import { ciRuleText } from '@base/features/apps/domain/structs/ci-ref.struct.ts';
  import type { CiIdentityEntity } from '@base/features/apps/domain/entities/ci-identity.entity.ts';
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

  const phone = new MediaQuery('(max-width: 639px)');

  let ending = $state<CredentialRow | null>(null);
  const now = new Date();

  const ICON = { token: KeyRoundIcon, ci: GitBranchIcon, key: LockIcon } as const;

  const live = (row: CredentialRow) =>
    row.kind === 'token' ? row.state !== 'revoked' : row.kind === 'key' ? !row.key.revokedAt : true;

  const identityBody = (identity: CiIdentityEntity) => {
    const rule = ciRuleText(identity);
    return rule.kind === 'branch'
      ? messages.removeIdentityBranchBody(identity.repository, rule.value)
      : messages.removeIdentityBody(identity.repository);
  };

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
        title: t(
          messages.removeIdentityTitle(
            t(ending.identity.provider === 'github' ? messages.github : messages.gitlab),
          ),
        ),
        body: t(identityBody(ending.identity)),
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

{#snippet expiry(row: CredentialRow, text: string)}
  {@const state = row.kind === 'token' ? row.state : 'ok'}
  <span
    class={cn(
      'inline-flex items-center gap-1.5 text-xs',
      state === 'soon' && 'text-warning',
      (state === 'expired' || state === 'revoked') && 'text-destructive',
      state === 'ok' && 'text-muted-foreground',
    )}
  >
    {#if row.kind === 'token'}
      <StatusShape state={tokenExpiryShape(state)} label={text} size={18} />
      <span aria-hidden="true">{text}</span>
    {:else}
      {text}
    {/if}
  </span>
{/snippet}

{#snippet rowMenu(row: CredentialRow, name: string)}
  {#if canManage && live(row)}
    <DropdownMenu>
      <DropdownMenuTrigger class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}>
        <EllipsisIcon class="size-4" aria-hidden="true" />
        <span class="sr-only">{t(messages.actionsOf(name))}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-40">
        <DropdownMenuItem variant="destructive" onSelect={() => (ending = row)}>
          <TrashIcon class="size-4" aria-hidden="true" />
          {row.kind === 'ci' ? t(messages.remove) : t(messages.revoke)}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  {/if}
{/snippet}

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
    {#if phone.current}
      <div class="flex flex-col gap-2">
        {#each rows as row (`${row.kind}-${row.id}`)}
          {@const labels = credentialLabels(row, now)}
          {@const Icon = ICON[row.kind]}
          <article
            class={cn(
              'flex flex-col gap-1 rounded-lg border p-3 text-xs',
              !live(row) && 'text-muted-foreground',
            )}
          >
            <div class="flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Icon class="size-4 shrink-0" aria-hidden="true" />
                <span class="truncate">{labels.name}</span>
              </span>
              {@render rowMenu(row, labels.name)}
            </div>
            <span class="text-muted-foreground">{labels.kind}</span>
            <span class="font-mono break-all">{labels.detail}</span>
            <span class="text-muted-foreground">{labels.sub}</span>
            {@render expiry(row, labels.expiry)}
            <span class="text-muted-foreground">
              {t(messages.lastUsedColumn)}:
              {row.lastUsedAt ? getRelativeTime(row.lastUsedAt) : t(messages.never)}
            </span>
          </article>
        {:else}
          <p class="rounded-lg border p-4 text-muted-foreground">{t(messages.noCredential)}</p>
        {/each}
      </div>
    {:else}
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t(messages.credential)}</TableHead>
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
            <TableRow class={live(row) ? '' : 'text-muted-foreground'}>
              <TableCell>
                <span class="flex items-center gap-2 font-medium">
                  <Icon class="size-4" aria-hidden="true" />
                  {labels.name}
                </span>
                <span class="text-xs text-muted-foreground">{labels.kind}</span>
              </TableCell>
              <TableCell>
                <span class="block font-mono text-xs">{labels.detail}</span>
                <span class="text-xs text-muted-foreground">{labels.sub}</span>
              </TableCell>
              <TableCell>
                {@render expiry(row, labels.expiry)}
              </TableCell>
              <TableCell class="text-xs">
                {row.lastUsedAt ? getRelativeTime(row.lastUsedAt) : t(messages.never)}
              </TableCell>
              <TableCell class="text-right">
                {@render rowMenu(row, labels.name)}
              </TableCell>
            </TableRow>
          {:else}
            <TableRow>
              <TableCell colspan={5} class="px-6 py-6 text-muted-foreground">
                {t(messages.noCredential)}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </TableFrame>
    {/if}
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
