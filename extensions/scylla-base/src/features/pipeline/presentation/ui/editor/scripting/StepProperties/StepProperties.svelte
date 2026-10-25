<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineStepEntity } from '@base/features/pipeline/domain/entities/pipeline-step.entity.ts';
  import type { PipelineScriptingState } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import { stepMessages } from '@base/features/pipeline/presentation/messages/step.messages.ts';
  import { ISSUE_MESSAGES } from '@base/features/pipeline/presentation/presenters/step-issue.presenter.ts';
  import {
    KIND_TONES,
    stepIcon,
  } from '@base/features/pipeline/presentation/presenters/step-kind.presenter.ts';
  import StepEnvFields from '@base/features/pipeline/presentation/ui/editor/step/StepEnvFields.svelte';
  import StepIdField from '@base/features/pipeline/presentation/ui/editor/step/StepIdField.svelte';
  import StepKindPicker from '@base/features/pipeline/presentation/ui/editor/step/StepKindPicker.svelte';
  import StepWorkingDirField from '@base/features/pipeline/presentation/ui/editor/step/StepWorkingDirField.svelte';
  import StepDependencies from './StepDependencies.svelte';

  interface Props {
    scripting: PipelineScriptingState;
    step: PipelineStepEntity;
    /** Scopes the secret picker. */
    projectId?: string;
  }

  let { scripting, step, projectId }: Props = $props();

  // The same draft as the pane's editor: an edit here and one there do not undo each other.
  const draft = $derived(scripting.draftOf(step));
  const Icon = $derived(stepIcon(draft.mode));
  const tone = $derived(KIND_TONES[draft.mode]);
</script>

<aside aria-label={t(scriptingMessages.stepProperties)} class="flex h-full flex-col border-l bg-card">
  <div class="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
    <div class="flex items-start gap-2.5">
      <span class={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone.tile, tone.text)}>
        <Icon class="size-4" />
      </span>
      <StepIdField {draft} />
    </div>

    <StepKindPicker {draft} />
    <StepWorkingDirField {draft} />

    <StepDependencies
      deps={step.deps}
      candidates={scripting.dependencyCandidates(step.id)}
      dependents={scripting.dependentsOf(step.id)}
      onChange={deps => scripting.setDependencies(step.id, deps)}
      onOpen={id => scripting.panes.open(id)}
    />

    <div class="-mx-4 flex flex-col">
      <span class="px-4 text-sm font-medium">{t(stepMessages.environment)}</span>
      <StepEnvFields {draft} {projectId} />
    </div>
  </div>

  {#if draft.issue}
    <p
      role="alert"
      class="mx-4 mb-2 flex items-center gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
    >
      <CircleAlertIcon class="size-4 shrink-0" />
      {t(ISSUE_MESSAGES[draft.issue])}
    </p>
  {/if}

  <div class="border-t px-4 py-3">
    <Button
      variant="ghost"
      size="sm"
      class="-ml-2 text-destructive hover:text-destructive"
      onclick={() => scripting.remove(step.id)}
    >
      <Trash2Icon class="size-4" />
      {t(scriptingMessages.deleteStep)}
    </Button>
  </div>
</aside>
