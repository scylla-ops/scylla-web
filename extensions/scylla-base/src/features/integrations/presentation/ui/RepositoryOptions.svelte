<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import GlobeIcon from '@lucide/svelte/icons/globe';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { Label, RadioGroup, RadioGroupItem } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { repositoryMessages as messages } from '@base/features/integrations/presentation/messages/repository.messages.ts';
  import type { RepositoryPicker } from './repository-picker.state.svelte.ts';

  interface Props {
    picker: RepositoryPicker;
    class?: string;
  }

  let { picker, class: className }: Props = $props();

  const id = $props.id();
</script>

<RadioGroup
  class={cn('relative flex flex-col gap-1 overflow-y-auto rounded-lg border p-1', className)}
  aria-label={t(messages.repository)}
  value={picker.chosen}
  onValueChange={value => picker.choose(value)}
>
  {#each picker.options as option (option.repository.externalId)}
    {@const checked = picker.chosen === option.repository.externalId && !option.taken}
    <Label
      class={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 font-normal transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        checked && 'bg-accent',
        option.taken ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent',
      )}
    >
      <RadioGroupItem
        value={option.repository.externalId}
        disabled={option.taken}
        class="sr-only"
        aria-labelledby="{id}-{option.repository.externalId}"
        aria-describedby="{id}-{option.repository.externalId}-details"
      />
      {#if option.repository.private}
        <LockIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {:else}
        <GlobeIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {/if}
      <span class="flex min-w-0 grow flex-col gap-0.5">
        <span id="{id}-{option.repository.externalId}" class="truncate font-mono text-sm font-medium">
          {option.repository.fullName}
        </span>
        <span
          id="{id}-{option.repository.externalId}-details"
          class="truncate text-xs text-muted-foreground"
        >
          {option.details}
        </span>
      </span>
      {#if checked}
        <CheckIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
      {/if}
    </Label>
  {/each}
</RadioGroup>
