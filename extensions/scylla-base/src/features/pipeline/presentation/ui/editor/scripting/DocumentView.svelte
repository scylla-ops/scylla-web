<script lang="ts">
  import { json, jsonParseLinter } from '@codemirror/lang-json';
  import { linter } from '@codemirror/lint';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import { renderCodeMirror } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineScript } from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
  import { createScriptEditor } from '@base/features/pipeline/presentation/ui/editor/script-editor.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { copyToClipboard } from './copy-to-clipboard.ts';
  import { scriptingMessages } from './scripting.messages.ts';

  interface Props {
    doc: PipelineScript;
  }

  let { doc }: Props = $props();

  const parseLinter = jsonParseLinter();

  const editor = createScriptEditor({
    value: () => doc.script,
    onChange: next => doc.setScript(next),
    // An empty editor is not an error: `parseScript` says so too.
    extensions: () => [
      json(),
      linter(view => (view.state.doc.toString().trim() ? parseLinter(view) : [])),
    ],
  });
</script>

<!-- The whole pipeline as one JSON document: the object that is saved, to copy and paste. -->
<div class="flex h-full flex-col gap-2">
  <div class="flex justify-end">
    <Button variant="outline" size="sm" onclick={() => copyToClipboard(doc.script)}>
      <CopyIcon class="size-3.5" />
      {t(scriptingMessages.copyAll)}
    </Button>
  </div>
  <div class="relative min-h-0 flex-1 overflow-auto p-2">
    <div
      class="h-full"
      {@attach renderCodeMirror(() => ({
        doc: doc.script,
        extensions: editor.extensions,
        hasError: !!doc.parseError,
        onView: editor.attach,
      }))}
    ></div>
  </div>
  {#if doc.parseError}
    <p class="text-sm text-destructive">
      {t(pipelineMessages.invalidJson)}: {doc.parseError}
    </p>
  {/if}
</div>
