<script lang="ts">
  import { StreamLanguage } from '@codemirror/language';
  import { shell as shellLanguage } from '@codemirror/legacy-modes/mode/shell';
  import { renderCodeMirror } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { StepDraft } from './step-draft.state.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { createCodeEditor } from '@base/features/pipeline/presentation/ui/editor/controls/code-editor.effect.svelte.ts';

  interface Props {
    draft: StepDraft;
    /** The editor fills a pane that draws the frame (see `renderCodeMirror`). */
    flush?: boolean;
    class?: string;
  }

  let { draft, flush = false, class: className }: Props = $props();

  const editor = createCodeEditor({
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
    flush,
    onView: editor.attach,
  }))}
></div>
