<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { PipelineDocument } from '@base/features/pipeline/presentation/ui/editor/pipeline-document.state.svelte.ts';
  import {
    createPipelineScripting,
    type ScriptingMode,
  } from '../pipeline-scripting.state.svelte.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import DocumentView from '../DocumentView.svelte';
  import NodesView from '../NodesView/NodesView.svelte';

  interface Props {
    doc: PipelineDocument;
    projectId?: string;
  }

  let { doc, projectId }: Props = $props();

  const scripting = createPipelineScripting({
    nodes: () => doc.nodes,
    isValid: () => doc.isValid,
    onNodesChange: nodes => doc.setNodes(nodes),
  });

  onDestroy(scripting.dispose);
</script>

<!-- Both views stay mounted, so CodeMirror keeps its scroll and the open nodes stay open. -->
<Tabs
  value={scripting.mode}
  onValueChange={mode => (scripting.mode = mode as ScriptingMode)}
  class="flex h-full flex-col gap-3"
>
  <TabsList aria-label={t(scriptingMessages.scriptView)} class="self-start">
    <TabsTrigger value="nodes" disabled={!scripting.canShowNodes}>
      {t(scriptingMessages.byNode)}
    </TabsTrigger>
    <TabsTrigger value="document">{t(scriptingMessages.fullDocument)}</TabsTrigger>
  </TabsList>

  <TabsContent value="nodes" class="min-h-0 flex-1">
    {#if scripting.canShowNodes}
      <NodesView {scripting} {projectId} />
    {/if}
  </TabsContent>
  <TabsContent value="document" class="min-h-0 flex-1">
    <DocumentView {doc} />
  </TabsContent>
</Tabs>
