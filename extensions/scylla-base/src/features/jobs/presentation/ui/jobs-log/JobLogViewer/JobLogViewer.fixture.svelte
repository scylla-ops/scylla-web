<script lang="ts">
  import { createLogDisplay } from '../log-display-settings.state.svelte.ts';
  import { createTailJobLogs } from '../tail-job-logs.state.svelte.ts';
  import JobLogViewer from './JobLogViewer.svelte';

  interface Props {
    nodeId?: string | null;
    isLive?: boolean;
    fullscreen?: boolean;
    onFullscreenChange?: (fullscreen: boolean) => void;
    unavailable?: string;
  }

  let {
    nodeId = null,
    isLive = false,
    fullscreen = false,
    onFullscreenChange = () => {},
    unavailable,
  }: Props = $props();

  const tail = createTailJobLogs({ jobId: () => 'job-1' });
  const display = createLogDisplay();
</script>

<!-- The viewer with the stream of the whole job, as the job page gives it. -->
<JobLogViewer
  {tail}
  {nodeId}
  title={nodeId ?? 'Whole job'}
  {display}
  {isLive}
  {fullscreen}
  {onFullscreenChange}
  fileName="job-1"
  {unavailable}
/>
