<script lang="ts">
  import InfoIcon from '@lucide/svelte/icons/info';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import UserIcon from '@lucide/svelte/icons/user';
  import { HoverCard, HoverCardContent, HoverCardTrigger, Separator } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { InstallWay } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { INSTALL_WAYS } from '../install-ways.registry.ts';

  interface Props {
    way: InstallWay;
    /** Docker with the socket of the machine: it also runs container steps. */
    socket: boolean;
  }

  let { way, socket }: Props = $props();

  const view = $derived(INSTALL_WAYS[way]);
  const powershells = [
    { icon: UserIcon, title: messages.powershell, body: messages.powershellUser },
    { icon: ShieldCheckIcon, title: messages.powershellAdmin, body: messages.powershellAdminBody },
  ];
  const notes = $derived([
    ...(way === 'windows' ? [[messages.scriptSteps, messages.scriptStepsNote] as const] : []),
    [messages.joinCode, messages.joinCodeNote] as const,
    [messages.oneMachine, messages.oneMachineNote] as const,
  ]);
</script>

<HoverCard openDelay={150}>
  <HoverCardTrigger>
    {#snippet child({ props })}
      <button
        type="button"
        {...props}
        class="flex rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <InfoIcon class="size-3.5" aria-hidden="true" />
        <span class="sr-only">{t(messages.installDetails)}</span>
      </button>
    {/snippet}
  </HoverCardTrigger>
  <HoverCardContent class="flex w-80 flex-col gap-3" side="bottom" align="start">
    <p class="flex items-center gap-2 text-sm font-medium">
      <view.icon class="size-4" aria-hidden="true" />
      {t(messages.installOn(t(view.label)))}
    </p>
    {#if way === 'windows'}
      <p class="text-xs text-muted-foreground">{t(messages.windowsHow)}</p>
      <ul class="flex flex-col gap-2">
        {#each powershells as item (item.title.id)}
          <li class="flex items-center gap-3 rounded-md border p-3">
            <item.icon class="size-4 shrink-0" aria-hidden="true" />
            <span class="flex flex-col gap-0.5">
              <span class="text-sm font-medium">{t(item.title)}</span>
              <span class="text-sm text-muted-foreground">{t(item.body)}</span>
            </span>
          </li>
        {/each}
      </ul>
    {:else if view.hint && !socket}
      <p class="text-xs text-muted-foreground">{t(view.hint)}</p>
    {/if}
    <Separator />
    <dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-xs">
      {#each notes as [term, note] (term.id)}
        <dt class="font-medium">{t(term)}</dt>
        <dd class="text-muted-foreground">{t(note)}</dd>
      {/each}
    </dl>
  </HoverCardContent>
</HoverCard>
