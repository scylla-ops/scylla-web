<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { StepDraft } from '@base/features/pipeline/presentation/ui/editor/step/step-draft.svelte.ts';
  import { stepPreview } from '@base/features/pipeline/presentation/ui/editor/step/step-summary.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import StepCommandFields from '@base/features/pipeline/presentation/ui/editor/step/StepCommandFields.svelte';
  import StepScriptField from '@base/features/pipeline/presentation/ui/editor/step/StepScriptField.svelte';

  interface Props {
    draft: StepDraft;
  }

  let { draft }: Props = $props();
</script>

<!-- A script is edited as shell code; a command, which runs with no shell, as a form. -->
{#if draft.mode === 'script'}
  <StepScriptField {draft} flush class="min-h-0" />
{:else}
  <div class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
    <div class="flex max-w-2xl flex-col gap-4">
      <StepCommandFields {draft} />
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">{t(scriptingMessages.commandPreview)}</span>
        <code class="rounded-md border bg-muted/40 px-3 py-2 font-mono text-[13px] break-all">
          {stepPreview(draft.value)}
        </code>
      </div>
    </div>
  </div>
{/if}
