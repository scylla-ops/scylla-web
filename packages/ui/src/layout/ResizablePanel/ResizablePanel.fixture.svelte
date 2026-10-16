<script lang="ts">
  import ResizablePanel from './ResizablePanel.svelte';

  let width = $state(300);
</script>

<ResizablePanel bind:width min={200} max={600}>
  <p>Panel</p>
</ResizablePanel>
<output>{width}</output>
