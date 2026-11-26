<script lang="ts">
  import type { ProjectCardContext } from '../../project.points.ts';

  let { context }: { context: ProjectCardContext } = $props();
</script>

<a href="/acme/projects/{context.projectId}/pipelines">
  Pipelines of {context.projectName}, batch of {context.batch.join(' and ')}
</a>
