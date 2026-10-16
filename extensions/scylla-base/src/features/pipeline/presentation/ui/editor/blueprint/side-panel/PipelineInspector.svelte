<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { pipelineNameIssue } from '@base/features/pipeline/presentation/utils/pipeline-script.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { START_ICON } from '../step-kinds.ts';

  interface Props {
    name: string;
    onNameChange: (name: string) => void;
    onClose: () => void;
  }

  let { name, onNameChange, onClose }: Props = $props();

  const uid = $props.id();

  // The draft: the name is applied whole, on blur or Enter.
  // svelte-ignore state_referenced_locally
  let draft = $state(name);
  const issue = $derived(pipelineNameIssue(draft));

  const apply = () => {
    const next = draft.trim();
    if (!issue && next !== name) onNameChange(next);
  };
</script>

<div class="flex h-full flex-col">
  <div class="flex items-center gap-2.5 border-b p-4">
    <span class="flex size-8 items-center justify-center rounded-lg bg-primary">
      <START_ICON class="size-4 fill-primary-foreground text-primary-foreground" />
    </span>
    <h2 class="flex-1 text-base font-semibold">{t(pipelineMessages.pipeline)}</h2>
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t(blueprintMessages.closePanel)}
      onclick={onClose}
    >
      <XIcon class="size-4" />
    </Button>
  </div>

  <div class="flex flex-col gap-2 p-4">
    <Label for="{uid}-name">{t(pipelineMessages.name)}</Label>
    <Input
      id="{uid}-name"
      bind:value={draft}
      placeholder={t(pipelineMessages.namePlaceholder)}
      aria-invalid={issue === 'spaces'}
      aria-describedby="{uid}-hint"
      onblur={apply}
      onkeydown={event => event.key === 'Enter' && apply()}
    />
    <p
      id="{uid}-hint"
      class={issue === 'spaces' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
    >
      {issue === 'spaces'
        ? t(blueprintMessages.noSpaces)
        : t(pipelineMessages.pipelineNameDescription)}
    </p>
  </div>
</div>
