<script lang="ts">
  import { Toaster } from '@scylla/ui/shadcn';
  import RouterView from './routing/view/RouterView/RouterView.svelte';
  import ThemeToggle from './shell/ThemeToggle.svelte';
</script>

<ThemeToggle />
<RouterView />
<Toaster />
