<script lang="ts">
  import { onMount } from 'svelte';
  import { navigateTo } from '../navigation/navigator.ts';

  let { to }: { to: string } = $props();

  onMount(() => navigateTo(to, { replace: true }));
</script>
