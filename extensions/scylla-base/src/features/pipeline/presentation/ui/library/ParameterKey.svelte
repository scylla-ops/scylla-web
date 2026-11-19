<script lang="ts">
  import BracesIcon from '@lucide/svelte/icons/braces';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import { cn } from '@scylla/ui/utils';
  import type { FragmentParameter } from '@base/features/pipeline/domain/entities/fragment.entity.ts';

  interface Props {
    parameter: FragmentParameter;
    required?: boolean;
    class?: string;
  }

  let { parameter, required = false, class: className }: Props = $props();
</script>

<!-- The name of a parameter, with the icon of its kind: a value, or a secret of the project. -->
<span class={cn('flex min-w-0 items-center gap-1.5 font-mono text-xs', className)}>
  {#if parameter.kind === 'secret'}
    <KeyRoundIcon class="size-3.5 shrink-0 text-warning" />
  {:else}
    <BracesIcon class="size-3.5 shrink-0 text-info" />
  {/if}
  <span class="truncate">{parameter.key}</span>
  {#if required}<span class="text-destructive" aria-hidden="true">*</span>{/if}
</span>
