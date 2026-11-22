<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ServerIcon from '@lucide/svelte/icons/server';
  import { Button } from '@scylla/ui/primitives';
  import { createAdminExit } from '@base/shell/presentation/layout/admin-exit.state.svelte.ts';

  const exit = createAdminExit();
  const host = window.location.host;
</script>

<!-- The top bar of the administration: the server that it changes, and the way out. -->
<p class="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground md:flex">
  <ServerIcon class="size-4 shrink-0" />
  <span class="truncate" title={host}>{host}</span>
</p>
<Button variant="outline" href={exit.href} class="ml-auto">
  <ArrowLeftIcon />
  {exit.label}
</Button>
