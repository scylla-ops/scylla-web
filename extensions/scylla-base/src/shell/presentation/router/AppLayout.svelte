<script lang="ts">
  import type { Snippet } from 'svelte';
  import WorkspaceGate from '../layout/ui/WorkspaceGate/WorkspaceGate.svelte';
  import AuthGuard from './AuthGuard/Auth.guard.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<AuthGuard>
  <WorkspaceGate>
    {@render children()}
  </WorkspaceGate>
</AuthGuard>
