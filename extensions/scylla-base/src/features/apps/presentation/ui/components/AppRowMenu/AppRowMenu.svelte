<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, copyToClipboard } from '@scylla/ui/utils';
  import { appStateOf, type AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentsListMessages as messages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    app: AppEntity;
    openLabel: string;
    onOpen: () => void;
    /** A new join code on the page of a new agent. Absent: the user may not make one. */
    onConnect?: () => void;
    /** Absent: the user may not disable, enable or delete the app. */
    onDisable?: () => void;
    onEnable?: () => void;
    onDelete?: () => void;
  }

  let { app, openLabel, onOpen, onConnect, onDisable, onEnable, onDelete }: Props = $props();

  const enableShown = $derived(!!app.disabledAt && !!onEnable);
  const disableShown = $derived(!enableShown && !!onDisable);
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 rounded-full')}
  >
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">{t(messages.actions(app.name))}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-48">
    <DropdownMenuItem onSelect={onOpen}>
      <ArrowRightIcon class="size-4" aria-hidden="true" />
      {openLabel}
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => copyToClipboard(app.id, { copied: t(messages.idCopied) })}>
      <CopyIcon class="size-4" aria-hidden="true" />
      {t(messages.copyId)}
    </DropdownMenuItem>
    {#if onConnect && !app.disabledAt}
      {@const never = appStateOf(app) === 'never'}
      <DropdownMenuItem onSelect={onConnect}>
        {#if never}
          <TerminalIcon class="size-4" aria-hidden="true" />
          {t(messages.finishSetup)}
        {:else}
          <KeyRoundIcon class="size-4" aria-hidden="true" />
          {t(messages.newJoinCode)}
        {/if}
      </DropdownMenuItem>
    {/if}
    {#if enableShown}
      <DropdownMenuItem onSelect={onEnable}>
        <PowerIcon class="size-4" aria-hidden="true" />
        {t(messages.enable)}
      </DropdownMenuItem>
    {/if}
    {#if disableShown || onDelete}
      <DropdownMenuSeparator />
    {/if}
    {#if disableShown}
      <DropdownMenuItem variant="destructive" onSelect={onDisable}>
        <PowerOffIcon class="size-4" aria-hidden="true" />
        {t(messages.disable)}
      </DropdownMenuItem>
    {/if}
    {#if onDelete}
      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <TrashIcon class="size-4" aria-hidden="true" />
        {t(messages.delete)}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
