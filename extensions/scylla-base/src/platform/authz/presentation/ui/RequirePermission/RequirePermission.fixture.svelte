<script lang="ts">
  import type { Permission } from '@platform/authz/domain/structs/permission.struct.ts';
  import RequirePermission from './RequirePermission.svelte';

  let { permission, message }: { permission: Permission; message?: string } = $props();
</script>

<RequirePermission {permission} {message}>
  <span>gated content</span>
</RequirePermission>
