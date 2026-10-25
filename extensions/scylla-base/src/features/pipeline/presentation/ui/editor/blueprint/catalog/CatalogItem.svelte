<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { CatalogEntry } from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog/node-catalog.ts';
  import { catalogText } from './catalog.ts';
  import CatalogIcon from './CatalogIcon.svelte';

  interface Props {
    entry: CatalogEntry;
    compact?: boolean;
  }

  let { entry, compact = false }: Props = $props();
</script>

<!-- The content of a palette or menu row: the kind's icon, the name, what it runs. -->
<CatalogIcon {entry} {compact} />
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
