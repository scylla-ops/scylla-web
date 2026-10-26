<script lang="ts">
  import type { OrganizationMembersContext } from '@base/features/membership/presentation/membership.points.ts';

  let { context }: { context: OrganizationMembersContext } = $props();
</script>

<button type="button" data-testid="organization-members-probe" onclick={context.refreshMembers}>
  {context.organizationName}|{context.organizationId}|{context.memberCount}|{context.canManage}
</button>
