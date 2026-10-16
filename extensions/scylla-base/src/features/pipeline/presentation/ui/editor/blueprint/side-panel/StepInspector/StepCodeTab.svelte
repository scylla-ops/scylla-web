<script lang="ts">
  import { StreamLanguage } from '@codemirror/language';
  import { shell as shellLanguage } from '@codemirror/legacy-modes/mode/shell';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { renderCodeMirror } from '@scylla/ui';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { Shell } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
  import type { StepInspector } from '@base/features/pipeline/presentation/step-inspector.state.svelte.ts';
  import { pipelineMessages } from '@base/features/pipeline/presentation/pipeline.messages.ts';
  import { createScriptEditor } from '@base/features/pipeline/presentation/ui/editor/script-editor.svelte.ts';

  interface Props {
    inspector: StepInspector;
  }

  let { inspector }: Props = $props();

  const editor = createScriptEditor({
    value: () => inspector.script,
    onChange: next => (inspector.script = next),
    extensions: () => [StreamLanguage.define(shellLanguage)],
  });

  const MODES = [
    { value: 'script', label: pipelineMessages.script },
    { value: 'exec', label: pipelineMessages.command },
  ] as const;
  const SHELLS: Shell[] = ['bash', 'sh'];

  const segment = (active: boolean) =>
    cn(
      'rounded-[5px] px-2.5 py-1 text-xs transition-colors',
      active ? 'bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
    );
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
  <div class="flex items-center gap-2">
    <!-- A script or a command, not both. -->
    <div class="flex gap-0.5 rounded-md bg-muted p-0.5">
      {#each MODES as mode (mode.value)}
        <button
          type="button"
          aria-pressed={inspector.mode === mode.value}
          class={segment(inspector.mode === mode.value)}
          onclick={() => (inspector.mode = mode.value)}
        >
          {t(mode.label)}
        </button>
      {/each}
    </div>
    {#if inspector.mode === 'script'}
      <div class="ml-auto flex gap-0.5 rounded-md bg-muted p-0.5" aria-label={t(pipelineMessages.shell)} role="group">
        {#each SHELLS as shell (shell)}
          <button
            type="button"
            aria-pressed={inspector.shell === shell}
            class={cn(segment(inspector.shell === shell), 'font-mono')}
            onclick={() => (inspector.shell = shell)}
          >
            {shell}
          </button>
        {/each}
      </div>
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
      <Label for="step-command">{t(pipelineMessages.command)}</Label>
      <Input
        id="step-command"
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
    <Label for="step-working-dir">{t(pipelineMessages.workingDirectory)}</Label>
    <Input
      id="step-working-dir"
      class="font-mono"
      value={inspector.workingDir}
      oninput={event => (inspector.workingDir = event.currentTarget.value)}
      placeholder={t(pipelineMessages.workingDirectoryPlaceholder)}
    />
  </div>
</div>
