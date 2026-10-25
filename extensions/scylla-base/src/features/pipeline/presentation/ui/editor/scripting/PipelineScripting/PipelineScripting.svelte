<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineScript } from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
  import {
    createPipelineScriptingState,
    type ScriptingMode,
  } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import DocumentView from '../DocumentView.svelte';
  import StepsView from '../StepsView/StepsView.svelte';

  interface Props {
    doc: PipelineScript;
    projectId?: string;
  }

  let { doc, projectId }: Props = $props();

  const scripting = createPipelineScriptingState({
    steps: () => doc.steps,
    isValid: () => doc.isValid,
    onStepsChange: steps => doc.setSteps(steps),
  });

  onDestroy(scripting.dispose);
</script>

<!-- Both views stay mounted, so CodeMirror keeps its scroll and the open steps stay open. -->
<Tabs
  value={scripting.mode}
  onValueChange={mode => (scripting.mode = mode as ScriptingMode)}
  class="flex h-full flex-col gap-3"
>
  <TabsList aria-label={t(scriptingMessages.scriptView)} class="self-start">
    <TabsTrigger value="steps" disabled={!scripting.canShowSteps}>
      {t(scriptingMessages.byStep)}
    </TabsTrigger>
    <TabsTrigger value="document">{t(scriptingMessages.fullDocument)}</TabsTrigger>
  </TabsList>

  <TabsContent value="steps" class="min-h-0 flex-1">
    {#if scripting.canShowSteps}
      <StepsView {scripting} {projectId} />
    {/if}
  </TabsContent>
  <TabsContent value="document" class="min-h-0 flex-1">
    <DocumentView {doc} />
  </TabsContent>
</Tabs>
