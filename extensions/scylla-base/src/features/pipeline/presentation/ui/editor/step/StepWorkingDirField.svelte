<script lang="ts">
  import { Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { StepDraft } from './step-draft.state.svelte.ts';
  import { stepMessages } from '@base/features/pipeline/presentation/messages/step.messages.ts';

  interface Props {
    draft: StepDraft;
  }

  let { draft }: Props = $props();

  const uid = $props.id();
</script>

<div class="flex flex-col gap-2">
  <Label for="{uid}-working-dir">{t(stepMessages.workingDirectory)}</Label>
  <Input
    id="{uid}-working-dir"
    class="font-mono"
    value={draft.workingDir}
    oninput={event => (draft.workingDir = event.currentTarget.value)}
    placeholder={t(stepMessages.workingDirectoryPlaceholder)}
  />
</div>
