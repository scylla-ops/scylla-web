<script lang="ts">
  import type {
    ProjectMembersContext,
  } from '@base/features/membership/presentation/membership.points.ts';

  let { context }: { context: ProjectMembersContext } = $props();
</script>

<span data-testid="project-members-probe">
  {context.organizationId}|{context.projectId}|{context.memberCount}|{context.canManage}
</span>
