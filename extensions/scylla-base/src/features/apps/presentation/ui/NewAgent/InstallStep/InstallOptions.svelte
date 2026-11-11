<script lang="ts">
  import { slide } from 'svelte/transition';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import {
    Button,
    Checkbox,
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
    /** Docker has no runtime choice: it can get the socket of the machine. */
    docker: boolean;
    capacity: string;
    runtime: ContainerRuntime;
    dockerContainers: boolean;
  }

  let {
    manual,
    version,
    docker,
    capacity = $bindable(),
    runtime = $bindable(),
    dockerContainers = $bindable(),
  }: Props = $props();

  let byHand = $state(false);

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

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1.5">
        <Label for="agent-capacity">{t(messages.capacity)}</Label>
        <Select type="single" bind:value={capacity}>
          <SelectTrigger id="agent-capacity" class="w-24">{capacity}</SelectTrigger>
          <SelectContent>
            {#each CAPACITIES as value (value)}
              <SelectItem {value} label={value}>{value}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
      {#if docker}
        <Label class="flex h-9 items-center gap-2 font-normal">
          <Checkbox
            checked={dockerContainers}
            onCheckedChange={checked => (dockerContainers = checked === true)}
          />
          {t(messages.dockerContainers)}
        </Label>
      {:else}
        <div class="flex flex-col gap-1.5">
          <Label for="agent-runtime">{t(messages.runtime)}</Label>
          <Select
            type="single"
            value={runtime}
            onValueChange={value => (runtime = value as ContainerRuntime)}
          >
            <SelectTrigger id="agent-runtime" class="min-w-56">{runtimeLabel(runtime)}</SelectTrigger>
            <SelectContent>
              {#each RUNTIMES as [value] (value)}
                <SelectItem {value} label={runtimeLabel(value)}>{runtimeLabel(value)}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>
      {/if}
    </div>
    <Button
      type="button"
      variant="link"
      class="h-9 px-0"
      aria-expanded={byHand}
      onclick={() => (byHand = !byHand)}
    >
      {t(messages.installByHand)}
      <ArrowRightIcon
        class={cn(
          'size-4 transition-transform duration-200 motion-reduce:transition-none',
          byHand && 'rotate-90',
        )}
        aria-hidden="true"
      />
    </Button>
  </div>
  {#if byHand}
    <div class="flex flex-col gap-2" transition:slide={{ duration: 200 }}>
      <CopyBox value={manual} layout="lines" copyToast={t(messages.copied)} />
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
</div>
