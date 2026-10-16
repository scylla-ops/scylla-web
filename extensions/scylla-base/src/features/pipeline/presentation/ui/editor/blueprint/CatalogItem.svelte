<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import { catalogText } from './catalog.ts';
  import { KIND_TONES, stepIcon } from './step-kinds.ts';

  interface Props {
    entry: CatalogEntry;
    compact?: boolean;
  }

  let { entry, compact = false }: Props = $props();

  const Icon = $derived(stepIcon(entry.definition.kind, entry.icon));
  const tone = $derived(KIND_TONES[entry.definition.kind]);
</script>

<!-- The content of a palette or menu row: the kind's icon, the name, what it runs. -->
<span
  class={cn(
    'flex shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-card',
    compact ? 'size-6' : 'size-8',
    tone.text,
  )}
>
  <Icon class={compact ? 'size-3.5' : 'size-4'} />
</span>
<span class="flex min-w-0 flex-1 flex-col text-left">
  <span class="truncate text-[13px] font-medium">{catalogText(entry.name)}</span>
  {#if !compact}
    <span
      class={cn(
        'truncate text-[11.5px] text-muted-foreground',
        entry.group === 'templates' && 'font-mono',
      )}
    >
      {catalogText(entry.detail)}
    </span>
  {/if}
</span>
