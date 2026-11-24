<script lang="ts">
  import TagsIcon from '@lucide/svelte/icons/tags';
  import { Permission, can } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { Button, Popover, PopoverContent, PopoverTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { sameAgentLabels } from '@shared/domain/structs/agent-label.struct.ts';
  import { AgentLabels, AgentLabelsField } from '@shared/presentation/ui';
  import { pipelineMutations } from '@base/features/pipeline/presentation/pipeline.queries.ts';
  import { pipelineMessages as messages } from '@base/features/pipeline/presentation/messages/pipeline.messages.ts';

  interface Props {
    pipelineId: string;
    /** The saved labels. */
    labels: readonly string[];
    disabled?: boolean;
  }

  let { pipelineId, labels, disabled = false }: Props = $props();

  const save = createMutation(() => pipelineMutations.setAgentLabels(pipelineId));
  const canEdit = $derived(can(Permission.UPDATE_PIPELINE));

  let open = $state(false);
  let draft = $state<string[]>([]);

  const submit = () => save.mutate(draft, { onSuccess: () => (open = false) });
</script>

<!-- The labels save at once, apart from the nodes: the document keeps its unsaved changes. -->
<Popover
  bind:open
  onOpenChange={next => {
    if (next) draft = [...labels];
  }}
>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        {disabled}
        title={labels.length ? t(messages.agentLabelsCount(labels.length)) : undefined}
      >
        <TagsIcon aria-hidden="true" />
        <!-- A narrow header shows the icon only; the name stays for a screen reader. -->
        <span class="max-md:sr-only">{t(messages.agentLabels)}</span>
        {#if labels.length}
          <span
            class="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-secondary px-1 font-mono text-[11px] leading-none text-secondary-foreground"
          >
            {labels.length}
          </span>
        {/if}
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent align="end" class="flex w-80 flex-col gap-3">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm">{t(messages.agentLabels)}</h3>
      <p class="text-xs text-muted-foreground">{t(messages.agentLabelsHint)}</p>
    </div>
    {#if canEdit}
      <AgentLabelsField
        labels={draft}
        onChange={next => (draft = next)}
        label={t(messages.agentLabels)}
        disabled={save.isPending}
        autofocus
      />
      <Button
        class="self-end"
        disabled={save.isPending || sameAgentLabels(draft, labels)}
        onclick={submit}
      >
        {t(messages.saveLabels)}
      </Button>
    {:else if labels.length}
      <AgentLabels {labels} label={t(messages.agentLabels)} />
    {/if}
  </PopoverContent>
</Popover>
