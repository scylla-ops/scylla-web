<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { Shell } from '@base/features/pipeline/domain/structs/step.struct.ts';
  import type { StepDraft } from './step-draft.state.svelte.ts';
  import { stepMessages } from '@base/features/pipeline/presentation/messages/step.messages.ts';
  import Segmented from '@base/features/pipeline/presentation/ui/editor/controls/Segmented.svelte';

  interface Props {
    draft: StepDraft;
    class?: string;
  }

  let { draft, class: className }: Props = $props();

  const modes = $derived([
    { value: 'script', label: t(stepMessages.script) },
    { value: 'exec', label: t(stepMessages.command) },
  ] as const);
  // `bash` and `sh` are names: not translated.
  const SHELLS = (['bash', 'sh'] satisfies Shell[]).map(shell => ({ value: shell, label: shell }));
</script>

<div class={cn('flex items-center gap-2', className)}>
  <!-- A script or a command, not both. -->
  <Segmented
    value={draft.mode}
    options={modes}
    label={t(stepMessages.stepKind)}
    onChange={mode => (draft.mode = mode)}
  />
  {#if draft.mode === 'script'}
    <Segmented
      value={draft.shell}
      options={SHELLS}
      label={t(stepMessages.shell)}
      onChange={shell => (draft.shell = shell)}
      class="ml-auto"
      itemClass="font-mono"
    />
  {/if}
</div>
