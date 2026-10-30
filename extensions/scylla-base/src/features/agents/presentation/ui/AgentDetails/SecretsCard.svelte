<script lang="ts">
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import {
    Badge,
    buttonVariants,
    Card,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import type { AppSecretEntity } from '@base/features/apps';
  import { agentsMessages } from '@base/features/agents/presentation/messages/agents.messages.ts';
  import RenameSecretDialog from '../components/RenameSecretDialog/RenameSecretDialog.svelte';
  import { renameSecretMessages } from '@base/features/agents/presentation/messages/rename-secret.messages.ts';
  import { agentDetailsMessages as messages } from '@base/features/agents/presentation/messages/agent-details.messages.ts';

  interface Props {
    secrets: AppSecretEntity[] | undefined;
    loading: boolean;
    canManage: boolean;
    onToggle: (secret: AppSecretEntity) => void;
    onRevoke: (secret: AppSecretEntity) => void;
  }

  let { secrets, loading, canManage, onToggle, onRevoke }: Props = $props();

  let renaming = $state<AppSecretEntity | null>(null);
</script>

<Card class="gap-4 px-5 py-5">
  <div class="flex flex-col gap-1">
    <h2 class="text-sm font-semibold">{t(messages.secrets)}</h2>
    <p class="text-xs text-muted-foreground">{t(messages.signsInWithOne)}</p>
  </div>

  {#if loading || !secrets}
    <Skeleton class="h-10 w-full" />
  {:else if secrets.length === 0}
    <p class="text-sm text-muted-foreground">{t(messages.noSecret)}</p>
  {:else}
    <ul class="flex flex-col gap-3">
      {#each secrets as secret (secret.id)}
        <li class="flex items-center gap-3">
          <KeyRoundIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm font-medium">{secret.label}</span>
            <span class="text-xs text-muted-foreground">
              {t(agentsMessages.createdOn(formatDay(secret.createdAt)))}
            </span>
          </div>
          <Badge variant="outline" class={cn('font-normal', !secret.enabled && 'text-muted-foreground')}>
            {secret.enabled ? t(messages.secretEnabled) : t(agentsMessages.stateDisabled)}
          </Badge>
          {#if canManage}
            <DropdownMenu>
              <DropdownMenuTrigger
                class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'hover:scale-100')}
              >
                <MoreHorizontalIcon class="size-4" />
                <span class="sr-only">{t(messages.secretActions(secret.label))}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-40">
                <DropdownMenuItem onSelect={() => (renaming = secret)}>
                  <PencilIcon />
                  {t(renameSecretMessages.rename)}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToggle(secret)}>
                  {#if secret.enabled}
                    <PowerOffIcon />
                    {t(agentsMessages.disable)}
                  {:else}
                    <PowerIcon />
                    {t(agentsMessages.enable)}
                  {/if}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onRevoke(secret)}>
                  <TrashIcon />
                  {t(messages.revoke)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <p class="text-xs text-muted-foreground">{t(messages.resetFootnote)}</p>
</Card>

{#if canManage}
  <RenameSecretDialog
    secret={renaming}
    secrets={secrets ?? []}
    onClose={() => (renaming = null)}
  />
{/if}
