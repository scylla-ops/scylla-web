<script lang="ts">
  import type { Snippet } from 'svelte';
  import OrganizationGate from '../layout/ui/OrganizationGate/OrganizationGate.svelte';
  import AuthGuard from './AuthGuard/Auth.guard.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<AuthGuard>
  <OrganizationGate>
    {@render children()}
  </OrganizationGate>
</AuthGuard>
