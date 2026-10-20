<script lang="ts">
  import {
    createPipelineScript,
    type PipelineScript,
  } from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
  import PipelineScripting from './PipelineScripting.svelte';

  interface Props {
    initialScript: string;
    /** Hands the document to the test, which reads what the view wrote. */
    onDoc: (doc: PipelineScript) => void;
  }

  let { initialScript, onDoc }: Props = $props();

  const doc = createPipelineScript({ projectId: () => 'project-1', initialScript: () => initialScript });
  // svelte-ignore state_referenced_locally
  onDoc(doc);
</script>

<div style="height: 600px">
  <PipelineScripting {doc} projectId="project-1" />
</div>
