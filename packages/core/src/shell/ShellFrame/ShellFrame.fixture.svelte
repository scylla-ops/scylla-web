<script lang="ts">
  import ShellFrame from './ShellFrame.svelte';

  let { space }: { space?: string } = $props();
</script>

<ShellFrame {space}>
  <p>page content</p>
</ShellFrame>
