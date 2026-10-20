<script lang="ts">
  import { StreamLanguage } from '@codemirror/language';
  import { shell as shellLanguage } from '@codemirror/legacy-modes/mode/shell';
  import { renderCodeMirror } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { StepDraft } from './step-draft.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { createScriptEditor } from '@base/features/pipeline/presentation/ui/editor/script-editor.svelte.ts';

  interface Props {
    draft: StepDraft;
    class?: string;
  }

  let { draft, class: className }: Props = $props();

  const editor = createScriptEditor({
    value: () => draft.script,
    onChange: next => (draft.script = next),
    extensions: () => [StreamLanguage.define(shellLanguage)],
  });
</script>

<!-- The script as it runs: shell code, with no JSON escapes. -->
<div
  class={cn('relative min-h-40 flex-1 overflow-auto [&_.cm-editor]:h-full', className)}
  aria-label={t(pipelineMessages.script)}
  {@attach renderCodeMirror(() => ({
    doc: draft.script,
    extensions: editor.extensions,
    hasError: draft.issue === 'empty-script',
    onView: editor.attach,
  }))}
></div>
