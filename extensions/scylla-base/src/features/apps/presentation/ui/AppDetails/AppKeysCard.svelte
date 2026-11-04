<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import type {
    AppKeyEntity,
    JoinCode,
  } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import JoinCodePanel from '../components/JoinCodePanel/JoinCodePanel.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    appId: string;
    runner: boolean;
    keys: AppKeyEntity[];
    /** `create_join_code` and `revoke_app_key`: the admins of the workspace. */
    canManage: boolean;
  }

  let { appId, runner, keys, canManage }: Props = $props();

  const joinCode = createMutation(() => appMutations.joinCode());
  const revoke = createMutation(() => appMutations.revokeKey());

  let shown = $state<JoinCode | null>(null);
</script>

<Card data-tour="agent-run">
  <CardHeader>
    <CardTitle><h2>{t(appsMessages.keys)}</h2></CardTitle>
    <CardDescription>{t(appsMessages.keysDescription)}</CardDescription>
    {#if canManage}
      <CardAction>
        <Button
          variant="outline"
          size="sm"
          disabled={joinCode.isPending}
          onclick={() => joinCode.mutate(appId, { onSuccess: code => (shown = code) })}
        >
          {t(appsMessages.newJoinCode)}
        </Button>
      </CardAction>
    {/if}
  </CardHeader>
  <CardContent>
    {#if keys.length === 0}
      <p class="text-sm text-muted-foreground">{t(appsMessages.noKeys)}</p>
    {:else}
      <ul class="flex flex-col divide-y" aria-label={t(appsMessages.keys)}>
        {#each keys as key (key.id)}
          <li class="flex items-center gap-3 py-2 text-sm">
            <span class="min-w-0 flex-1 truncate font-mono text-xs">{key.id}</span>
            <span class="text-xs text-muted-foreground">
              {key.revokedAt
                ? t(appsMessages.keyRevokedAt(formatDate(key.revokedAt)))
                : t(appsMessages.keyCreated(formatDate(key.createdAt)))}
            </span>
            {#if canManage && !key.revokedAt}
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                aria-label={`${t(appsMessages.revoke)} ${key.id}`}
                onclick={() => revoke.mutate({ appId, keyId: key.id })}
              >
                {t(appsMessages.revoke)}
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>

<Dialog
  open={shown !== null}
  onOpenChange={open => {
    if (!open) shown = null;
  }}
>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>{t(appsMessages.joinTitle)}</DialogTitle>
    </DialogHeader>
    {#if shown}
      <JoinCodePanel joinCode={shown} {runner} />
    {/if}
    <DialogFooter>
      <Button onclick={() => (shown = null)}>{t(appsMessages.done)}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
