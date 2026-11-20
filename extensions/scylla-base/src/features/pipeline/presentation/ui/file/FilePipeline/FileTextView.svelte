<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { StreamLanguage } from '@codemirror/language';
  import { toml } from '@codemirror/legacy-modes/mode/toml';
  import { yaml } from '@codemirror/legacy-modes/mode/yaml';
  import { EditorState, type Extension } from '@codemirror/state';
  import { EditorView } from '@codemirror/view';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import { renderCodeMirror } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { copyToClipboard } from '@scylla/ui/utils';
  import type { PipelineFile } from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
  import type { PipelineFileFormat } from '@base/features/pipeline/domain/structs/pipeline-file-format.struct.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';

  interface Props {
    file: PipelineFile;
  }

  let { file }: Props = $props();

  const LANGUAGES: Record<PipelineFileFormat, () => Extension> = {
    toml: () => StreamLanguage.define(toml),
    yaml: () => StreamLanguage.define(yaml),
    json: () => json(),
  };

  // A format this build does not know is shown as plain text.
  const extensions = $derived([
    ...(file.format ? [LANGUAGES[file.format]()] : []),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
  ]);
</script>

<!-- The text of the file at the commit, read only. A new commit mounts a new editor. -->
<div class="flex h-full flex-col gap-2">
  <div class="flex items-center justify-between gap-3">
    <p class="flex min-w-0 items-center gap-2 text-muted-foreground">
      <FileCodeIcon class="size-4 shrink-0" aria-hidden="true" />
      <span class="truncate font-mono text-xs">{file.path}</span>
    </p>
    <Button variant="outline" size="sm" onclick={() => copyToClipboard(file.content)}>
      <CopyIcon class="size-3.5" />
      {t(scriptingMessages.copyAll)}
    </Button>
  </div>
  <div class="relative min-h-0 flex-1 overflow-auto p-2">
    {#key `${file.commitSha}:${file.path}`}
      <div class="h-full" {@attach renderCodeMirror(() => ({ doc: file.content, extensions }))}></div>
    {/key}
  </div>
</div>
