<script lang="ts">
  import { createRunPipeline } from '@base/features/pipeline';
  import CommandConfirm from './CommandConfirm.svelte';

  interface Props {
    pipelineId: string;
    question: string;
    detail: string;
    verb: string;
    onCancel: () => void;
    onDone: () => void;
  }

  let { pipelineId, question, detail, verb, onCancel, onDone }: Props = $props();

  // Here, not in the bar: it reads the agents, which only a run needs.
  const runner = createRunPipeline();
</script>

<CommandConfirm {question} {detail} {verb} run={() => runner.run(pipelineId)} {onCancel} {onDone} />
