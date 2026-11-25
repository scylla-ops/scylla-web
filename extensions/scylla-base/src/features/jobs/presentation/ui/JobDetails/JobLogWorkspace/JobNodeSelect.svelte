<script lang="ts">
  import { StatusShape } from '@scylla/ui';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import { jobLogMessages } from '@base/features/jobs/presentation/messages/job-log.messages.ts';
  import type { NodeItem } from './job-log-workspace.state.svelte.ts';

  interface Props {
    /** The whole job first, then its steps. */
    items: NodeItem[];
    selectedId: string | null;
    errorCount: (nodeId: string | null) => number;
    onSelect: (nodeId: string | null) => void;
  }

  let { items, selectedId, errorCount, onSelect }: Props = $props();

  /** The value of the whole job: a node id cannot be empty. */
  const WHOLE_JOB = '';
  const selected = $derived(items.find(item => item.id === selectedId) ?? items[0]);
  const labelOf = (item: NodeItem) => {
    const errors = errorCount(item.id);
    return errors > 0 ? `${item.name} · ${t(jobLogMessages.errorCount(errors))}` : item.name;
  };
</script>

{#snippet option(item: NodeItem)}
  <span class="flex min-w-0 items-center gap-2">
    <StatusShape
      state={toStatusState(item.state)}
      label={t(getStatusConfig(item.state).label)}
      size={16}
    />
    <span class="truncate">{labelOf(item)}</span>
  </span>
{/snippet}

<!-- On a narrow screen, the list of the nodes is a select above the log. -->
<Select
  type="single"
  value={selectedId ?? WHOLE_JOB}
  onValueChange={value => onSelect(value === WHOLE_JOB ? null : value)}
>
  <SelectTrigger class="w-full shrink-0" aria-label={t(jobLogMessages.chooseNode)}>
    {#if selected}
      {@render option(selected)}
    {/if}
  </SelectTrigger>
  <SelectContent>
    {#each items as item (item.id ?? WHOLE_JOB)}
      <SelectItem value={item.id ?? WHOLE_JOB} label={labelOf(item)}>
        {@render option(item)}
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
