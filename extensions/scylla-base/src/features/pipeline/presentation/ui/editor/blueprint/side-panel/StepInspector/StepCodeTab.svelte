<script lang="ts">
  import { StreamLanguage } from '@codemirror/language';
  import { shell as shellLanguage } from '@codemirror/legacy-modes/mode/shell';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { renderCodeMirror } from '@scylla/ui';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { Shell } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import type { StepInspector } from './step-inspector.state.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { createScriptEditor } from '@base/features/pipeline/presentation/ui/editor/script-editor.svelte.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/ui/editor/blueprint/blueprint.messages.ts';
  import Segmented from '@base/features/pipeline/presentation/ui/editor/blueprint/controls/Segmented.svelte';

  interface Props {
    inspector: StepInspector;
  }

  let { inspector }: Props = $props();

  const editor = createScriptEditor({
    value: () => inspector.script,
    onChange: next => (inspector.script = next),
    extensions: () => [StreamLanguage.define(shellLanguage)],
  });

  const uid = $props.id();

  const modes = $derived([
    { value: 'script', label: t(pipelineMessages.script) },
    { value: 'exec', label: t(pipelineMessages.command) },
  ] as const);
  // `bash` and `sh` are names: not translated.
  const SHELLS = (['bash', 'sh'] satisfies Shell[]).map(shell => ({ value: shell, label: shell }));
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
  <div class="flex items-center gap-2">
    <!-- A script or a command, not both. -->
    <Segmented
      value={inspector.mode}
      options={modes}
      label={t(blueprintMessages.stepKind)}
      onChange={mode => (inspector.mode = mode)}
    />
    {#if inspector.mode === 'script'}
      <Segmented
        value={inspector.shell}
        options={SHELLS}
        label={t(pipelineMessages.shell)}
        onChange={shell => (inspector.shell = shell)}
        class="ml-auto"
        itemClass="font-mono"
      />
    {/if}
  </div>

  {#if inspector.mode === 'script'}
    <div
      class="relative min-h-40 flex-1 overflow-auto [&_.cm-editor]:h-full"
      aria-label={t(pipelineMessages.script)}
      {@attach renderCodeMirror(() => ({
        doc: inspector.script,
        extensions: editor.extensions,
        hasError: inspector.issue === 'empty-script',
        onView: editor.attach,
      }))}
    ></div>
  {:else}
    <div class="flex flex-col gap-2">
      <Label for="{uid}-command">{t(pipelineMessages.command)}</Label>
      <Input
        id="{uid}-command"
        class="font-mono"
        value={inspector.command}
        oninput={event => (inspector.command = event.currentTarget.value)}
        placeholder={t(pipelineMessages.commandPlaceholder)}
      />
    </div>
    <div class="flex flex-col gap-2">
      <Label>{t(pipelineMessages.argumentsLabel)}</Label>
      {#each inspector.args as arg, index (index)}
        <div class="flex items-center gap-2">
          <Input
            class="font-mono"
            value={arg}
            oninput={event => inspector.setArg(index, event.currentTarget.value)}
            placeholder={t(pipelineMessages.argumentPlaceholder)}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t(pipelineMessages.removeArgument)}
            onclick={() => inspector.removeArg(index)}
          >
            <Trash2Icon class="size-4" />
          </Button>
        </div>
      {/each}
      <Button variant="outline" size="sm" class="self-start" onclick={() => inspector.addArg()}>
        <PlusIcon class="size-4" />
        {t(pipelineMessages.addArgument)}
      </Button>
    </div>
  {/if}

  <div class="flex flex-col gap-2">
    <Label for="{uid}-working-dir">{t(pipelineMessages.workingDirectory)}</Label>
    <Input
      id="{uid}-working-dir"
      class="font-mono"
      value={inspector.workingDir}
      oninput={event => (inspector.workingDir = event.currentTarget.value)}
      placeholder={t(pipelineMessages.workingDirectoryPlaceholder)}
    />
  </div>
</div>
