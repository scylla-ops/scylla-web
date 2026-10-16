<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import XIcon from '@lucide/svelte/icons/x';
  import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    PipelineStep,
    StepDefinition,
  } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import { createStepInspector } from '@base/features/pipeline/presentation/step-inspector.state.svelte.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import { ISSUE_MESSAGES } from '@base/features/pipeline/presentation/ui/editor/blueprint/nodes/node-view.ts';
  import {
    KIND_TONES,
    stepIcon,
  } from '@base/features/pipeline/presentation/ui/editor/blueprint/step-kinds.ts';
  import StepCodeTab from './StepCodeTab.svelte';
  import StepEnvTab from './StepEnvTab.svelte';

  interface Props {
    /** Read once: the panel rebuilds the inspector for each step. */
    step: PipelineStep;
    dependencies: string[];
    /** Scopes the secret picker. */
    projectId?: string;
    onChange: (value: StepDefinition) => void;
    /** Returns the id the step really got. */
    onRename: (id: string) => string;
    onDelete: () => void;
    onClose: () => void;
  }

  let { step, dependencies, projectId, onChange, onRename, onDelete, onClose }: Props = $props();

  // svelte-ignore state_referenced_locally
  const inspector = createStepInspector({
    step,
    onChange: value => onChange(value),
    onRename: id => onRename(id),
  });

  const Icon = $derived(stepIcon(inspector.mode));
  const tone = $derived(KIND_TONES[inspector.mode]);
  const envCount = $derived(inspector.envRows.filter(row => row.key.trim()).length);
</script>

<div class="flex h-full flex-col">
  <div class="flex flex-col gap-2.5 px-4 pt-3.5">
    <div class="flex items-center gap-2.5">
      <span
        class={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone.tile, tone.text)}
      >
        <Icon class="size-4" />
      </span>
      <label class="flex min-w-0 flex-1 flex-col">
        <span class="text-[11px] text-muted-foreground">{t(blueprintMessages.stepId)}</span>
        <input
          class="-ml-1 rounded-md border border-transparent bg-transparent px-1 text-base font-semibold outline-none hover:border-border focus:border-primary"
          bind:value={inspector.id}
          onblur={() => inspector.rename()}
          onkeydown={event => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(blueprintMessages.closePanel)}
        onclick={onClose}
      >
        <XIcon class="size-4" />
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {#if dependencies.length === 0}
        <span>{t(blueprintMessages.runsFirst)}</span>
      {:else}
        <span>{t(blueprintMessages.after)}</span>
        {#each dependencies as dependency (dependency)}
          <span
            class="rounded-md border bg-accent px-1.5 py-0.5 font-mono text-[11.5px] text-foreground"
          >
            {dependency}
          </span>
        {/each}
      {/if}
    </div>
  </div>

  <Tabs value="code" class="mt-2 flex min-h-0 flex-1 flex-col gap-0">
    <TabsList class="mx-4 self-start">
      <TabsTrigger value="code">{t(blueprintMessages.code)}</TabsTrigger>
      <TabsTrigger value="environment">
        {t(blueprintMessages.environment)}
        {#if envCount}
          <span class="ml-1 rounded-full bg-muted px-1.5 text-[11px]">{envCount}</span>
        {/if}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="code" class="flex min-h-0 flex-1 flex-col">
      <StepCodeTab {inspector} />
    </TabsContent>
    <TabsContent value="environment" class="relative min-h-0 flex-1 overflow-y-auto">
      <StepEnvTab {inspector} {projectId} />
    </TabsContent>
  </Tabs>

  {#if inspector.issue}
    <p
      role="alert"
      class="mx-4 mb-2 flex items-center gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
    >
      <CircleAlertIcon class="size-4 shrink-0" />
      {t(ISSUE_MESSAGES[inspector.issue])}
    </p>
  {/if}

  <div class="flex items-center gap-2 border-t px-4 py-3">
    <Button
      variant="ghost"
      size="sm"
      class="-ml-2 text-destructive hover:text-destructive"
      onclick={onDelete}
    >
      <Trash2Icon class="size-4" />
      {t(blueprintMessages.deleteStep)}
    </Button>
    <span class="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckIcon class="size-3.5 text-primary" />
      {t(blueprintMessages.appliedToDraft)}
    </span>
    <Button variant="outline" size="sm" onclick={onClose}>
      {t(blueprintMessages.close)}
    </Button>
  </div>
</div>
