<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { StepDraft } from './step-draft.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';

  interface Props {
    draft: StepDraft;
  }

  let { draft }: Props = $props();

  const uid = $props.id();
</script>

<!-- One program and its arguments, run with no shell. -->
<div class="flex flex-col gap-2">
  <Label for="{uid}-command">{t(pipelineMessages.command)}</Label>
  <Input
    id="{uid}-command"
    class="font-mono"
    value={draft.command}
    oninput={event => (draft.command = event.currentTarget.value)}
    placeholder={t(pipelineMessages.commandPlaceholder)}
  />
</div>
<div class="flex flex-col gap-2">
  <Label>{t(pipelineMessages.argumentsLabel)}</Label>
  {#each draft.args as arg, index (index)}
    <div class="flex items-center gap-2">
      <Input
        class="font-mono"
        value={arg}
        oninput={event => draft.setArg(index, event.currentTarget.value)}
        placeholder={t(pipelineMessages.argumentPlaceholder)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(pipelineMessages.removeArgument)}
        onclick={() => draft.removeArg(index)}
      >
        <Trash2Icon class="size-4" />
      </Button>
    </div>
  {/each}
  <Button variant="outline" size="sm" class="self-start" onclick={() => draft.addArg()}>
    <PlusIcon class="size-4" />
    {t(pipelineMessages.addArgument)}
  </Button>
</div>
