<script lang="ts">
  import { StreamLanguage } from '@codemirror/language';
  import { shell as shellLanguage } from '@codemirror/legacy-modes/mode/shell';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@scylla/ui/shadcn';
  import { renderCodeMirror } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { Shell } from '../../../../../domain/structs/pipeline.struct.ts';
  import { createScriptEditor } from '../../script-editor.svelte.ts';
  import type { StepNodeForm } from '../step-node-form.state.svelte.ts';
  import { pipelineMessages } from '../../../../pipeline.messages.ts';

  interface Props {
    form: StepNodeForm;
  }

  let { form }: Props = $props();

  const editor = createScriptEditor({
    value: () => form.script,
    onChange: next => (form.script = next),
    extensions: () => [StreamLanguage.define(shellLanguage)],
  });
</script>

<section class="flex flex-col gap-2 border-b px-5 py-4">
  <div class="flex items-center justify-between">
    <h3 class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {t(pipelineMessages.script)}
    </h3>
    <Select type="single" value={form.shell} onValueChange={value => (form.shell = value as Shell)}>
      <SelectTrigger aria-label={t(pipelineMessages.shell)} size="sm" class="h-7 w-20 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sh" label="sh">sh</SelectItem>
        <SelectItem value="bash" label="bash">bash</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div
    aria-label={t(pipelineMessages.script)}
    class="max-h-80 min-h-32 overflow-auto text-[12.5px]"
    use:renderCodeMirror={{ doc: form.script, extensions: editor.extensions, onView: editor.attach }}
  ></div>
</section>
