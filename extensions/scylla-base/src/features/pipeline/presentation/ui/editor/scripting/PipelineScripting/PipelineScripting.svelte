<script lang="ts">
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineScript } from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
  import { createScriptingState, type ScriptingMode } from '../scripting.state.svelte.ts';
  import { scriptingMessages } from '../scripting.messages.ts';
  import DocumentView from '../DocumentView.svelte';
  import JobsView from '../JobsView.svelte';

  interface Props {
    doc: PipelineScript;
    projectId?: string;
  }

  let { doc, projectId }: Props = $props();

  const scripting = createScriptingState({
    steps: () => doc.steps,
    isValid: () => doc.isValid,
    onStepsChange: steps => doc.setSteps(steps),
  });
</script>

<!-- Both views stay mounted, so CodeMirror keeps its scroll and the open jobs stay open. -->
<Tabs
  value={scripting.mode}
  onValueChange={mode => (scripting.mode = mode as ScriptingMode)}
  class="flex h-full flex-col gap-3"
>
  <TabsList aria-label={t(scriptingMessages.scriptView)} class="self-start">
    <TabsTrigger value="jobs" disabled={!scripting.canShowJobs}>
      {t(scriptingMessages.byJob)}
    </TabsTrigger>
    <TabsTrigger value="document">{t(scriptingMessages.fullDocument)}</TabsTrigger>
  </TabsList>

  <TabsContent value="jobs" class="min-h-0 flex-1">
    <JobsView {scripting} {projectId} />
  </TabsContent>
  <TabsContent value="document" class="min-h-0 flex-1">
    <DocumentView {doc} />
  </TabsContent>
</Tabs>
