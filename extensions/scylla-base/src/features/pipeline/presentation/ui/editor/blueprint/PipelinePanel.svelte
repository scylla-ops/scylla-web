<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Input, Label } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { pipelineMessages } from '../../../pipeline.messages.ts';

  interface Props {
    name: string;
    onNameChange: (name: string) => void;
    onClose: () => void;
  }

  let { name, onNameChange, onClose }: Props = $props();

  // No whitespace: the name goes into a URL and the breadcrumb.
  const commit = (value: string) => {
    const next = value.trim();
    if (next && !/\s/.test(next) && next !== name) onNameChange(next);
  };
</script>

<aside class="flex w-100 shrink-0 flex-col border-l bg-card" aria-label={t(pipelineMessages.pipeline)}>
  <header class="flex items-center gap-2.5 border-b py-3 pr-3 pl-5">
    <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <PlayIcon class="size-4 fill-current" />
    </span>
    <h2 class="flex-1 text-base font-semibold">{t(pipelineMessages.pipeline)}</h2>
    <Button type="button" variant="ghost" size="icon-sm" aria-label={t(blueprintMessages.closePanel)} onclick={onClose}>
      <XIcon class="size-4" />
    </Button>
  </header>
  <section class="flex flex-col gap-2 px-5 py-4">
    <Label for="pipeline-name" class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {t(pipelineMessages.pipelineName)}
    </Label>
    <Input
      id="pipeline-name"
      value={name}
      placeholder={t(pipelineMessages.namePlaceholder)}
      pattern="^\S+$"
      onchange={event => commit(event.currentTarget.value)}
      onkeydown={event => {
        if (event.key === 'Enter') commit(event.currentTarget.value);
      }}
      class="font-mono text-[13px] invalid:border-destructive"
    />
    <p class="text-xs text-muted-foreground">{t(blueprintMessages.nameHint)}</p>
  </section>
</aside>
