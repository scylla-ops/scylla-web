<script lang="ts">
  import { currentSearch, routePathname } from '@scylla/core-sdk';
  import RoleEditor from './RoleEditor.svelte';

  const listUrl = $derived(routePathname().split('/').slice(0, -1).join('/'));
  const startKey = new URLSearchParams(currentSearch()).get('from') ?? undefined;
</script>

<RoleEditor {listUrl} {startKey} />
