<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code-2';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Input, Label } from '@scylla/ui/shadcn';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineStep } from '../../../../../domain/structs/pipeline.struct.ts';
  import type { BlueprintState } from '../../../../blueprint.state.svelte.ts';
  import { createStepNodeForm } from '../step-node-form.state.svelte.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { pipelineMessages } from '../../../../pipeline.messages.ts';
  import StepCommandFields from './StepCommandFields.svelte';
  import StepDependencies from './StepDependencies.svelte';
  import StepEnvironment from './StepEnvironment.svelte';
  import StepScriptFields from './StepScriptFields.svelte';

  interface Props {
    blueprint: BlueprintState;
    step: PipelineStep;
    /** Scopes the secret picker. */
    projectId?: string;
  }

  let { blueprint, step, projectId }: Props = $props();

  // Seeded once, deliberately: the blueprint renders this under a `{#key}` on the
  // step id, so another step, or a rename, builds a new panel.
  // svelte-ignore state_referenced_locally
  const originalId = step.id;
  // svelte-ignore state_referenced_locally
  const form = createStepNodeForm(step, {
    // Each edit goes to the draft at once: there is no "save" in the panel.
    onChange: ({ nodeId, value }) => blueprint.updateStep(originalId, nodeId, value),
  });

  const kinds = [
    { mode: 'script', label: pipelineMessages.script },
    { mode: 'exec', label: pipelineMessages.command },
  ] as const;
</script>

<aside
  class="flex w-100 shrink-0 flex-col border-l bg-card shadow-[-12px_0_32px_-24px_oklch(0_0_0/0.35)]"
  aria-label={step.id}
>
  <header class="flex items-center gap-2.5 border-b py-3 pr-3 pl-5">
    <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
      {#if form.mode === 'script'}<FileCodeIcon class="size-4" />{:else}<TerminalIcon class="size-4" />{/if}
    </span>
    <div class="flex min-w-0 flex-1 flex-col">
      <Label for="step-id" class="text-[11px] font-normal text-muted-foreground">
        {t(blueprintMessages.stepId)}
      </Label>
      <Input
        id="step-id"
        bind:value={form.nodeId}
        onchange={form.commitId}
        onkeydown={event => {
          if (event.key === 'Enter') form.commitId();
        }}
        class="h-7 border-0 bg-transparent px-0 font-mono text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t(blueprintMessages.deleteStep)}
      onclick={() => blueprint.removeStep(originalId)}
      class="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2Icon class="size-4" />
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t(blueprintMessages.closePanel)}
      onclick={() => blueprint.select(null)}
    >
      <XIcon class="size-4" />
    </Button>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    <section class="flex flex-col gap-2 border-b px-5 py-4">
      <h3
        id="step-type"
        class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
      >
        {t(blueprintMessages.stepType)}
      </h3>
      <div role="group" aria-labelledby="step-type" class="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
        {#each kinds as kind (kind.mode)}
          <button
            type="button"
            aria-pressed={form.mode === kind.mode}
            onclick={() => (form.mode = kind.mode)}
            class={cn(
              'h-8 rounded-md text-[13px] transition-colors',
              form.mode === kind.mode
                ? 'bg-card font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(kind.label)}
          </button>
        {/each}
      </div>
    </section>

    {#if form.mode === 'script'}
      <StepScriptFields {form} />
    {:else}
      <StepCommandFields {form} />
    {/if}

    <StepDependencies {blueprint} stepId={originalId} deps={step.deps} />

    <section class="flex flex-col gap-2 border-b px-5 py-4">
      <Label
        for="step-working-dir"
        class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
      >
        {t(pipelineMessages.workingDirectory)}
      </Label>
      <Input
        id="step-working-dir"
        value={form.workingDir}
        oninput={event => (form.workingDir = event.currentTarget.value)}
        placeholder={t(pipelineMessages.workingDirectoryPlaceholder)}
        class="font-mono text-[13px]"
      />
    </section>

    <StepEnvironment {form} {projectId} />
  </div>

  <footer class="border-t px-5 py-3 text-xs text-muted-foreground">
    {t(blueprintMessages.draftNote)}
  </footer>
</aside>
