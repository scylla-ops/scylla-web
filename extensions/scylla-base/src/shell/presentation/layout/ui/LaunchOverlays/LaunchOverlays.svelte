<script lang="ts">
  import { unseenRelease } from '@base/shell/presentation/layout/whats-new.state.svelte.ts';
  import WhatsNewDialog from '../WhatsNewDialog/WhatsNewDialog.svelte';
</script>

<!-- The release announcement. The onboarding tour comes back with its feature. -->
{#if unseenRelease()}
  <WhatsNewDialog />
{/if}
