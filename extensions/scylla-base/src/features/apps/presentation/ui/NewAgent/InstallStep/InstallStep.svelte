<script lang="ts">
  import { createQuery } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    AGENT_IMAGE,
    type ContainerRuntime,
    DEFAULT_INSTALL_OPTIONS,
    type InstallWay,
    installCommands,
    isLoopback,
    secondsLeft,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { appQueries } from '@base/features/apps/presentation/apps.queries.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import InstallCommand from './InstallCommand.svelte';
  import InstallOptions from './InstallOptions.svelte';
  import OsTiles from './OsTiles.svelte';

  interface Props {
    joinCode: JoinCode;
    /** The time of the countdown, in ms. */
    now: number;
    onNewCode: () => void;
    renewing: boolean;
    way: InstallWay;
  }

  let { joinCode, now, onNewCode, renewing, way = $bindable() }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;

  const info = createQuery(() => appQueries.server());

  let capacity = $state(String(DEFAULT_INSTALL_OPTIONS.capacity));
  let runtime = $state<ContainerRuntime>(DEFAULT_INSTALL_OPTIONS.containerRuntime);
  let dockerContainers = $state(DEFAULT_INSTALL_OPTIONS.dockerContainers);

  const commands = $derived(
    installCommands(server, joinCode.code, info.data?.agentImage || AGENT_IMAGE, {
      capacity: Number(capacity),
      containerRuntime: runtime,
      dockerContainers,
    }),
  );
  const socket = $derived(way === 'docker' && dockerContainers);
</script>

<div class="flex flex-col gap-4">
  <OsTiles bind:way />
  <div data-tour="app-join-code">
    <InstallCommand
      command={commands[way]}
      {way}
      {socket}
      left={secondsLeft(joinCode.expiresAt, new Date(now))}
      {renewing}
      {onNewCode}
    />
  </div>
  {#if socket}
    <p class="text-xs text-warning" role="alert">{t(messages.dockerSocketWarning)}</p>
  {:else if way === 'docker' && isLoopback(server)}
    <p class="text-xs text-muted-foreground">{t(messages.dockerLocalHint)}</p>
  {/if}
  <InstallOptions
    manual={commands.manual}
    version={info.data?.version}
    docker={way === 'docker'}
    bind:capacity
    bind:runtime
    bind:dockerContainers
  />
</div>
