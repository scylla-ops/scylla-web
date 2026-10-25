<script lang="ts">
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { pipelineNameIssue } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';

  interface Props {
    /** Read once: the header rebuilds the field when the document's name changes. */
    name: string;
    onNameChange: (name: string) => void;
    disabled?: boolean;
  }

  let { name, onNameChange, disabled = false }: Props = $props();

  const uid = $props.id();

  // The draft: the name is applied whole, on blur or Enter; Escape gives the saved one back.
  // svelte-ignore state_referenced_locally
  let draft = $state(name);
  const issue = $derived(pipelineNameIssue(draft));

  const apply = () => {
    const next = draft.trim();
    if (issue) draft = name;
    else if (next !== name) onNameChange(next);
  };
</script>

<!-- The title of the document, edited in place: an input with its label as a prefix. -->
<div class="relative min-w-0">
  <label
    class={cn(
      'flex h-8 max-w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30',
      'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
      issue === 'spaces' &&
        'border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20 dark:ring-destructive/40',
      disabled && 'pointer-events-none opacity-50',
    )}
  >
    <span
      class="flex h-full shrink-0 items-center gap-1.5 border-r border-input bg-muted/50 px-2.5 text-xs whitespace-nowrap text-muted-foreground"
    >
      <WorkflowIcon class="size-3.5" />
      {t(pipelineMessages.pipelineName)}
    </span>
    <input
      class="field-sizing-content h-full max-w-120 min-w-32 shrink bg-transparent px-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground"
      bind:value={draft}
      {disabled}
      placeholder={t(pipelineMessages.namePlaceholder)}
      aria-invalid={issue === 'spaces'}
      aria-describedby={issue === 'spaces' ? `${uid}-issue` : undefined}
      onblur={apply}
      onkeydown={event => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          draft = name;
          event.currentTarget.blur();
        }
      }}
    />
  </label>
  {#if issue === 'spaces'}
    <p
      id="{uid}-issue"
      class="absolute top-full left-0 z-10 mt-1 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-destructive shadow-md"
    >
      {t(pipelineMessages.noSpaces)}
    </p>
  {/if}
</div>
