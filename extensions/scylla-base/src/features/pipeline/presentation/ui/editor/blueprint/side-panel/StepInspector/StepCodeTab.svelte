<script lang="ts">
  import type { StepDraft } from '@base/features/pipeline/presentation/ui/editor/step/step-draft.svelte.ts';
  import StepCommandFields from '@base/features/pipeline/presentation/ui/editor/step/StepCommandFields.svelte';
  import StepKindPicker from '@base/features/pipeline/presentation/ui/editor/step/StepKindPicker.svelte';
  import StepScriptField from '@base/features/pipeline/presentation/ui/editor/step/StepScriptField.svelte';
  import StepWorkingDirField from '@base/features/pipeline/presentation/ui/editor/step/StepWorkingDirField.svelte';

  interface Props {
    draft: StepDraft;
  }

  let { draft }: Props = $props();
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
  <StepKindPicker {draft} />

  {#if draft.mode === 'script'}
    <StepScriptField {draft} />
  {:else}
    <StepCommandFields {draft} />
  {/if}

  <StepWorkingDirField {draft} />
</div>
