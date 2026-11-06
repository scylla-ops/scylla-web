<script lang="ts">
  import BoxIcon from '@lucide/svelte/icons/box';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import LaptopIcon from '@lucide/svelte/icons/laptop';
  import MonitorIcon from '@lucide/svelte/icons/monitor';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import { createQuery } from '@scylla/core-sdk';
  import { Button, Checkbox, Label, Tabs, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    AGENT_IMAGE,
    type ContainerRuntime,
    DEFAULT_INSTALL_OPTIONS,
    formatCountdown,
    type InstallWay,
    installCommands,
    isLoopback,
    LOG_COMMANDS,
    secondsLeft,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import OtherWays from './OtherWays.svelte';

  interface Props {
    joinCode: JoinCode;
    onNewCode: () => void;
    renewing: boolean;
    /** A machine joined, and its agent did not connect yet. */
    joined?: boolean;
  }

  let { joinCode, onNewCode, renewing, joined = false }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;
  const shownAt = Date.now();

  const info = createQuery(() => appQueries.server());

  let way = $state<InstallWay>('linux');
  let capacity = $state(String(DEFAULT_INSTALL_OPTIONS.capacity));
  let runtime = $state<ContainerRuntime>(DEFAULT_INSTALL_OPTIONS.containerRuntime);
  let dockerContainers = $state(DEFAULT_INSTALL_OPTIONS.dockerContainers);
  let now = $state(new Date());

  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(timer);
  });

  const commands = $derived(
    installCommands(server, joinCode.code, info.data?.agentImage || AGENT_IMAGE, {
      capacity: Number(capacity),
      containerRuntime: runtime,
      dockerContainers,
    }),
  );
  const left = $derived(secondsLeft(joinCode.expiresAt, now));
  const waitedOneMinute = $derived(now.getTime() - shownAt >= 60_000);
  const socket = $derived(way === 'docker' && dockerContainers);

  const WAYS = [
    ['linux', messages.linux, TerminalIcon],
    ['macos', messages.macos, LaptopIcon],
    ['windows', messages.windows, MonitorIcon],
    ['docker', messages.docker, BoxIcon],
  ] as const;
  const HINTS = {
    linux: messages.linuxHint,
    macos: messages.macosHint,
    windows: messages.windowsHint,
    docker: messages.dockerHint,
  };
</script>

<div class="flex flex-col gap-4">
  <p class="text-sm">{t(messages.runThis)}</p>
  <Tabs value={way} onValueChange={value => (way = value as InstallWay)}>
    <TabsList class="grid w-full grid-cols-4">
      {#each WAYS as [value, label, Icon] (value)}
        <TabsTrigger {value} class="gap-2">
          <Icon class="hidden size-4 sm:block" aria-hidden="true" />
          {t(label)}
        </TabsTrigger>
      {/each}
    </TabsList>
  </Tabs>
  <div class="flex flex-col gap-2" data-tour="app-join-code">
    <CopyBox
      value={commands[way]}
      layout={socket ? 'lines' : 'wrap'}
      copyToast={t(messages.copied)}
      focusOnMount
    />
    {#if !socket}
      <p class="text-xs text-muted-foreground">{t(HINTS[way])}</p>
    {/if}
    {#if way === 'docker'}
      <Label class="flex items-center gap-2 text-xs font-normal">
        <Checkbox
          checked={dockerContainers}
          onCheckedChange={checked => (dockerContainers = checked === true)}
        />
        {t(messages.dockerContainers)}
      </Label>
      {#if dockerContainers}
        <p class="text-xs text-warning" role="alert">{t(messages.dockerSocketWarning)}</p>
      {:else if isLoopback(server)}
        <p class="text-xs text-muted-foreground">{t(messages.dockerLocalHint)}</p>
      {/if}
    {/if}
    <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ClockIcon class="size-3.5" aria-hidden="true" />
      <span>{left > 0 ? t(messages.expiresIn(formatCountdown(left))) : t(messages.expired)}</span>
      <Button
        type="button"
        variant="link"
        size="sm"
        class="h-auto p-0 text-xs"
        disabled={renewing}
        onclick={onNewCode}
      >
        {t(messages.newCode)}
      </Button>
    </p>
    <p class="text-xs text-muted-foreground">{t(messages.codeHint)}</p>
    <p class="text-xs text-muted-foreground">{t(messages.oneMachine)}</p>
  </div>

  <div class="flex items-center gap-3 rounded-lg border px-4 py-3" role="status">
    <span class="relative flex size-2" aria-hidden="true">
      <span
        class="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75 motion-reduce:animate-none"
      ></span>
      <span class="relative inline-flex size-2 rounded-full bg-warning"></span>
    </span>
    <span class="flex-1 text-sm">{joined ? t(messages.joined) : t(messages.waiting)}</span>
    <span class="text-xs text-muted-foreground">{t(messages.checksEvery)}</span>
  </div>

  {#if waitedOneMinute}
    <div class="flex flex-col gap-1.5">
      <p class="text-xs text-muted-foreground">{t(messages.noConnection)}</p>
      <CopyBox value={LOG_COMMANDS[way]} layout="lines" copyToast={t(messages.copied)} />
    </div>
  {/if}

  <OtherWays
    manual={commands.manual}
    version={info.data?.version}
    showRuntime={way !== 'docker'}
    bind:capacity
    bind:runtime
  />
</div>
