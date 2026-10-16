<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { START_ICON } from '../step-icons.ts';

  interface Props {
    name: string;
    onNameChange: (name: string) => void;
    onClose: () => void;
  }

  let { name, onNameChange, onClose }: Props = $props();

  // The draft: the name goes into a URL and the breadcrumb, so it is applied whole and without spaces.
  // svelte-ignore state_referenced_locally
  let draft = $state(name);
  const invalid = $derived(/\s/.test(draft.trim()));

  const apply = () => {
    const next = draft.trim();
    if (next && !invalid && next !== name) onNameChange(next);
  };
</script>

<div class="flex h-full flex-col">
  <div class="flex items-center gap-2.5 border-b p-4">
    <span class="flex size-8 items-center justify-center rounded-lg bg-primary">
      <START_ICON class="size-4 fill-primary-foreground text-primary-foreground" />
    </span>
    <h2 class="flex-1 text-base font-semibold">{t(pipelineMessages.pipeline)}</h2>
    <Button variant="ghost" size="icon-sm" aria-label={t(blueprintMessages.closePanel)} onclick={onClose}>
      <XIcon class="size-4" />
    </Button>
  </div>

  <div class="flex flex-col gap-2 p-4">
    <Label for="pipeline-name">{t(pipelineMessages.name)}</Label>
    <Input
      id="pipeline-name"
      bind:value={draft}
      placeholder={t(pipelineMessages.namePlaceholder)}
      aria-invalid={invalid}
      aria-describedby="pipeline-name-hint"
      onblur={apply}
      onkeydown={event => event.key === 'Enter' && apply()}
    />
    <p id="pipeline-name-hint" class={invalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
      {invalid ? t(blueprintMessages.noSpaces) : t(pipelineMessages.pipelineNameDescription)}
    </p>
  </div>
</div>
