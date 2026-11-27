<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import PaletteIcon from '@lucide/svelte/icons/palette';
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
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    app: AppEntity;
    /** "Delete the agent…" or "Delete the app…". */
    deleteLabel: string;
    /** Absent: the user may not change the icon (`set_app_icon`). */
    onChangeIcon?: () => void;
    /** A new join code on the install step of an agent. Absent: the user may not make one. */
    onConnect?: () => void;
    /** Absent: the user may not disable, enable or delete the app. */
    onDisable?: () => void;
    onEnable?: () => void;
    onDelete?: () => void;
  }

  let { app, deleteLabel, onChangeIcon, onConnect, onDisable, onEnable, onDelete }: Props =
    $props();

  const enableShown = $derived(!!app.disabledAt && !!onEnable);
  const disableShown = $derived(!app.disabledAt && !!onDisable);
</script>

<!-- The actions of the header of an app or an agent, in the order of the menu of a row of the list. -->
<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-9 shrink-0')}
  >
    <EllipsisIcon class="size-4" aria-hidden="true" />
    <span class="sr-only">{t(agentsListMessages.actions(app.name))}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="w-52">
    {#if onChangeIcon}
      <DropdownMenuItem onSelect={onChangeIcon}>
        <PaletteIcon class="size-4" aria-hidden="true" />
        {t(messages.changeIcon)}
      </DropdownMenuItem>
    {/if}
    {#if onConnect && !app.disabledAt}
      <DropdownMenuItem onSelect={onConnect}>
        {#if appStateOf(app) === 'never'}
          <TerminalIcon class="size-4" aria-hidden="true" />
          {t(agentsListMessages.finishSetup)}
        {:else}
          <KeyRoundIcon class="size-4" aria-hidden="true" />
          {t(agentsListMessages.newJoinCode)}
        {/if}
      </DropdownMenuItem>
    {/if}
    <DropdownMenuItem
      onSelect={() => copyToClipboard(app.id, { copied: t(agentsListMessages.idCopied) })}
    >
      <CopyIcon class="size-4" aria-hidden="true" />
      {t(messages.copyId)}
    </DropdownMenuItem>
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
        {t(messages.disableMenu)}
      </DropdownMenuItem>
    {/if}
    {#if onDelete}
      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <TrashIcon class="size-4" aria-hidden="true" />
        {deleteLabel}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
