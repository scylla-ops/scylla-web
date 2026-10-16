<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Permission } from '@platform/authz/domain/structs/permission.struct.ts';
  import type {
    PermissionTarget,
  } from '@platform/authz/domain/entities/effective-permissions.entity.ts';
  import { can } from '@platform/authz/presentation/authorization.ts';

  interface Props {
    permission: Permission;
    target?: PermissionTarget;
    fallback?: Snippet;
    children: Snippet;
  }

  let { permission, target, fallback, children }: Props = $props();

  const allowed = $derived(can(permission, target));
</script>

{#if allowed}
  {@render children()}
{:else}
  {@render fallback?.()}
{/if}
