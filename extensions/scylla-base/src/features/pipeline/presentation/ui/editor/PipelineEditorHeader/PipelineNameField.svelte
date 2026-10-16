<script lang="ts">
  import { Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { pipelineNameIssue } from '@base/features/pipeline/presentation/utils/pipeline-script.ts';

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

<!-- The title of the document, edited in place, with the look of the app's inputs. -->
<div class="relative">
  <Input
    class="h-8 w-56 font-mono text-sm"
    aria-label={t(pipelineMessages.pipelineName)}
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
  {#if issue === 'spaces'}
    <p
      id="{uid}-issue"
      class="absolute top-full right-0 z-10 mt-1 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-destructive shadow-md"
    >
      {t(pipelineMessages.noSpaces)}
    </p>
  {/if}
</div>
