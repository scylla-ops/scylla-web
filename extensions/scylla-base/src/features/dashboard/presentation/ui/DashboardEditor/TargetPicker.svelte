<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { catalogMessages } from '@base/features/dashboard/presentation/messages/catalog.messages.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import { targetOptions, type WidgetTarget } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';

  interface Props {
    kind: WidgetTarget;
    value: string | undefined;
    widgets: DashboardWidgets;
    onChange: (value: string) => void;
  }

  let { kind, value, widgets, onChange }: Props = $props();

  const options = $derived(targetOptions(kind, widgets.agents.data ?? [], widgets.summaries.data?.items ?? []));
  const label = $derived(kind === 'agent' ? t(catalogMessages.agent) : t(catalogMessages.pipeline));
  const chosen = $derived(options.find(option => option.id === value));
</script>

<div class="flex flex-col gap-1.5">
  <p class="text-xs text-muted-foreground">{label}</p>
  {#if options.length === 0}
    <p class="text-sm text-muted-foreground">
      {kind === 'agent' ? t(messages.noAgentToPick) : t(messages.noPipelineToPick)}
    </p>
  {:else}
    <Select type="single" value={value ?? ''} onValueChange={onChange}>
      <SelectTrigger class="w-full" aria-label={label}>
        <SelectValue>{chosen?.label ?? (kind === 'agent' ? t(messages.pickAgent) : t(messages.pickPipeline))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {#each options as option (option.id)}
          <SelectItem value={option.id} label={option.label}>
            <span class="truncate">{option.label}</span>
            {#if option.detail}<span class="ml-auto truncate text-xs text-muted-foreground">{option.detail}</span>{/if}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {/if}
</div>
