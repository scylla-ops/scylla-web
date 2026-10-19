<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/utils/node-catalog.ts';
  import { KIND_TONES, stepIcon } from '@base/features/pipeline/presentation/ui/editor/step/step-kinds.ts';

  interface Props {
    entry: CatalogEntry;
    compact?: boolean;
    class?: string;
  }

  let { entry, compact = false, class: className }: Props = $props();

  const Icon = $derived(stepIcon(entry.definition.kind, entry.icon));
  const tone = $derived(KIND_TONES[entry.definition.kind]);
</script>

<!-- The tile of an entry: the icon of its kind, or of its template. -->
<span
  class={cn(
    'flex shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-card',
    compact ? 'size-6' : 'size-8',
    tone.text,
    className,
  )}
>
  <Icon class={compact ? 'size-3.5' : 'size-4'} />
</span>
