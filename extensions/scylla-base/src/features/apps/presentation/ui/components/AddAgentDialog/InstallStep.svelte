<script lang="ts">
  import { slide } from 'svelte/transition';
  import BoxIcon from '@lucide/svelte/icons/box';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import MonitorIcon from '@lucide/svelte/icons/monitor';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import {
    Button,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    Tabs,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    type ContainerRuntime,
    DEFAULT_INSTALL_OPTIONS,
    formatCountdown,
    type InstallWay,
    installCommands,
    secondsLeft,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    joinCode: JoinCode;
    onNewCode: () => void;
    renewing: boolean;
  }

  let { joinCode, onNewCode, renewing }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;

  let way = $state<InstallWay>('unix');
  let capacity = $state(String(DEFAULT_INSTALL_OPTIONS.capacity));
  let runtime = $state<ContainerRuntime>(DEFAULT_INSTALL_OPTIONS.containerRuntime);
  let otherWays = $state(false);
  let now = $state(new Date());

  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 1000);
    return () => clearInterval(timer);
  });

  const commands = $derived(
    installCommands(server, joinCode.code, {
      capacity: Number(capacity),
      containerRuntime: runtime,
    }),
  );
  const left = $derived(secondsLeft(joinCode.expiresAt, now));

  const WAYS = [
    ['unix', messages.unix, TerminalIcon],
    ['windows', messages.windows, MonitorIcon],
    ['docker', messages.docker, BoxIcon],
  ] as const;
  const CAPACITIES = ['1', '2', '3', '4', '6', '8'];
  const RUNTIMES = [
    ['auto', messages.runtimeAuto],
    ['docker', null],
    ['podman', null],
    ['none', messages.runtimeNone],
  ] as const;
  const runtimeLabel = (value: ContainerRuntime) => {
    const label = RUNTIMES.find(([item]) => item === value)?.[1];
    return label ? t(label) : value;
  };
</script>

<div class="flex flex-col gap-4">
  <p class="text-sm">{t(messages.runThis)}</p>
  <Tabs value={way} onValueChange={value => (way = value as InstallWay)}>
    <TabsList class="grid w-full grid-cols-3">
      {#each WAYS as [value, label, Icon] (value)}
        <TabsTrigger {value} class="gap-2">
          <Icon class="size-4" aria-hidden="true" />
          {t(label)}
        </TabsTrigger>
      {/each}
    </TabsList>
  </Tabs>
  <CopyBox value={commands[way]} copyToast={t(messages.copied)} focusOnMount />

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

  <div class="flex items-center gap-3 rounded-lg border px-4 py-3" role="status">
    <span class="relative flex size-2" aria-hidden="true">
      <span
        class="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75 motion-reduce:animate-none"
      ></span>
      <span class="relative inline-flex size-2 rounded-full bg-warning"></span>
    </span>
    <span class="flex-1 text-sm">{t(messages.waiting)}</span>
    <span class="text-xs text-muted-foreground">{t(messages.checksEvery)}</span>
  </div>

  <button
    type="button"
    class="flex w-full items-center gap-2 text-left text-sm"
    aria-expanded={otherWays}
    onclick={() => (otherWays = !otherWays)}
  >
    <ChevronRightIcon
      class={cn(
        'size-4 transition-transform duration-200 motion-reduce:transition-none',
        otherWays && 'rotate-90',
      )}
      aria-hidden="true"
    />
    <span class="flex-1 font-medium">{t(messages.otherWays)}</span>
    <span class="text-xs text-muted-foreground">{t(messages.otherWaysHint)}</span>
  </button>
  {#if otherWays}
    <div class="flex flex-col gap-3" transition:slide={{ duration: 200 }}>
      <CopyBox value={commands.manual} layout="lines" copyToast={t(messages.copied)} />
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <Label for="agent-capacity" class="text-xs">{t(messages.capacity)}</Label>
          <Select type="single" bind:value={capacity}>
            <SelectTrigger id="agent-capacity" class="w-full">{capacity}</SelectTrigger>
            <SelectContent>
              {#each CAPACITIES as value (value)}
                <SelectItem {value} label={value}>{value}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="agent-runtime" class="text-xs">{t(messages.runtime)}</Label>
          <Select
            type="single"
            value={runtime}
            onValueChange={value => (runtime = value as ContainerRuntime)}
          >
            <SelectTrigger id="agent-runtime" class="w-full">{runtimeLabel(runtime)}</SelectTrigger>
            <SelectContent>
              {#each RUNTIMES as [value] (value)}
                <SelectItem {value} label={runtimeLabel(value)}>{runtimeLabel(value)}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">{t(messages.manualHint)}</p>
    </div>
  {/if}
</div>
