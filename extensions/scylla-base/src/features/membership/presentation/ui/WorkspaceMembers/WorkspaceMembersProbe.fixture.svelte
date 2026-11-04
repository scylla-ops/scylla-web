<script lang="ts">
  import type {
    WorkspaceMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';

  let { context }: { context: WorkspaceMembersContext } = $props();
</script>

<button type="button" data-testid="workspace-members-probe" onclick={context.refreshMembers}>
  {context.workspaceName}|{context.workspaceId}|{context.memberCount}|{context.canManage}
</button>
