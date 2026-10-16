<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Input, Label } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { StepNodeForm } from '../step-node-form.state.svelte.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { pipelineMessages } from '../../../../pipeline.messages.ts';

  interface Props {
    form: StepNodeForm;
  }

  let { form }: Props = $props();

  const commandLine = $derived([form.command.trim(), ...form.args.filter(Boolean)].join(' '));
</script>

<section class="flex flex-col gap-2 border-b px-5 py-4">
  <Label for="step-program" class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
    {t(blueprintMessages.program)}
  </Label>
  <Input
    id="step-program"
    value={form.command}
    oninput={event => (form.command = event.currentTarget.value)}
    placeholder={t(blueprintMessages.programPlaceholder)}
    class="font-mono text-[13px]"
  />

  <h3 class="mt-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
    {t(pipelineMessages.argumentsLabel)}
  </h3>
  <!-- An argument is its position: indexed, like the form keeps it. -->
  {#each form.args as arg, index (index)}
    <div class="flex items-center gap-1.5">
      <Input
        value={arg}
        oninput={event => form.setArg(index, event.currentTarget.value)}
        placeholder={t(pipelineMessages.argumentPlaceholder)}
        aria-label={t(blueprintMessages.argument(index + 1))}
        class="font-mono text-[13px]"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t(pipelineMessages.removeArgument)}
        onclick={() => form.removeArg(index)}
      >
        <XIcon class="size-4" />
      </Button>
    </div>
  {/each}
  <Button type="button" variant="outline" size="sm" class="self-start border-dashed" onclick={form.addArg}>
    <PlusIcon class="size-4" />
    {t(pipelineMessages.addArgument)}
  </Button>

  {#if commandLine}
    <code class="mt-1 rounded-md bg-muted/70 px-2.5 py-2 font-mono text-xs break-all text-foreground/80">
      $ {commandLine}
    </code>
  {/if}
</section>
