<script lang="ts" generics="Value">
  import { cn } from '@scylla/ui/utils';

  interface Props {
    label: string;
    options: { value: Value; label: string }[];
    value: Value;
    onChange: (value: Value) => void;
  }

  let { label, options, value, onChange }: Props = $props();
</script>

<!-- One choice among a few, as pressed chips. -->
<div role="group" aria-label={label} class="flex flex-wrap gap-1.5">
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={option.value === value}
      class={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-primary/50',
        option.value === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
      )}
      onclick={() => onChange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
