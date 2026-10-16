<script lang="ts">
  import type { LucideIcon } from '@scylla/ui';
  import ContainerIcon from '@lucide/svelte/icons/container';
  import LayersIcon from '@lucide/svelte/icons/layers';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import { Input, Label, ToggleGroup, ToggleGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    hostPortOf,
    RUN_METHODS,
    runCommandOf,
    type RunMethod,
  } from './run-command.calculator.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { agentRunCommandMessages as messages } from './agent-run-command.messages.ts';

  interface Props {
    appId: string;
    /** `null`: the command shows a placeholder. */
    secret: string | null;
    /** Shows the secret in the command. The secret box of the dialog drives it. */
    revealed?: boolean;
  }

  let { appId, secret, revealed = false }: Props = $props();

  const id = $props.id();

  // The control plane serves this page: its origin is the first guess.
  const origin = window.location.origin;
  let address = $state(origin);
  let method = $state<RunMethod>('docker');

  const METHODS: Record<RunMethod, { icon: LucideIcon; label: () => string }> = {
    docker: { icon: ContainerIcon, label: () => 'Docker' },
    compose: { icon: LayersIcon, label: () => 'Docker Compose' },
    source: { icon: TerminalIcon, label: () => t(messages.fromSource) },
  };

  const command = $derived(runCommandOf(method, { address, appId, secret }));
</script>

<div class="flex min-w-0 flex-col gap-2">
  <Label for="{id}-address" class="text-sm font-medium">{t(messages.address)}</Label>
  <Input id="{id}-address" bind:value={address} spellcheck={false} autocomplete="off" />
  <p class="text-xs text-muted-foreground">{t(messages.addressHelp(hostPortOf(origin)))}</p>

  <ToggleGroup
    type="single"
    spacing={0.5}
    value={method}
    onValueChange={value => {
      if (value) method = value as RunMethod;
    }}
    aria-label={t(messages.method)}
    class="mt-3 max-w-full flex-wrap rounded-lg bg-muted p-1"
  >
    {#each RUN_METHODS as option (option)}
      {@const Icon = METHODS[option].icon}
      <ToggleGroupItem
        value={option}
        size="sm"
        class="h-7 gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
      >
        <Icon class="size-4" />
        {METHODS[option].label()}
      </ToggleGroupItem>
    {/each}
  </ToggleGroup>

  <div data-tour="agent-run-command">
    <CopyBox
      value={command}
      secret={secret ?? undefined}
      {revealed}
      toggle={false}
      caption={t(messages.runOnMachine)}
      layout="lines"
      copyToast={t(messages.commandCopied)}
    />
  </div>
</div>
