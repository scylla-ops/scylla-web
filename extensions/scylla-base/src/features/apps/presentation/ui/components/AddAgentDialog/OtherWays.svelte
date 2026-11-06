<script lang="ts">
  import { slide } from 'svelte/transition';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import {
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    type ContainerRuntime,
    releaseUrl,
    SOURCE_URL,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { CopyBox } from '@shared/presentation/ui';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    /** `scylla-agent join` then `scylla-agent run`. */
    manual: string;
    /** The version of the server: its release has the same binary. */
    version: string | undefined;
    showRuntime: boolean;
    capacity: string;
    runtime: ContainerRuntime;
  }

  let {
    manual,
    version,
    showRuntime,
    capacity = $bindable(),
    runtime = $bindable(),
  }: Props = $props();

  let open = $state(false);

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
  const LINK = 'text-primary underline-offset-4 hover:underline';
</script>

<button
  type="button"
  class="flex w-full items-center gap-2 text-left text-sm"
  aria-expanded={open}
  onclick={() => (open = !open)}
>
  <ChevronRightIcon
    class={cn(
      'size-4 transition-transform duration-200 motion-reduce:transition-none',
      open && 'rotate-90',
    )}
    aria-hidden="true"
  />
  <span class="flex-1 font-medium">{t(messages.otherWays)}</span>
  <span class="text-xs text-muted-foreground">{t(messages.otherWaysHint)}</span>
</button>
{#if open}
  <div class="flex flex-col gap-3" transition:slide={{ duration: 200 }}>
    <CopyBox value={manual} layout="lines" copyToast={t(messages.copied)} />
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
      {#if showRuntime}
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
      {/if}
    </div>
    <p class="text-xs text-muted-foreground">
      {t(messages.manualHint)}
      <a class={LINK} href={releaseUrl(version)} target="_blank" rel="noreferrer">
        {t(messages.releaseLink)}
      </a>
      ·
      <a class={LINK} href={SOURCE_URL} target="_blank" rel="noreferrer">
        {t(messages.sourceLink)}
      </a>
    </p>
  </div>
{/if}
