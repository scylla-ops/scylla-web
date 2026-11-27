<script lang="ts">
  import { createQueries } from '@scylla/core-sdk';
  import type { ProjectPrefetchContext } from '@base/features/project';
  import { pipelineQueries } from '../../pipeline.queries.ts';

  interface Props {
    context: ProjectPrefetchContext;
  }

  let { context }: Props = $props();

  // The cards of a folded section read these same entries when it opens: nothing waits then.
  createQueries(() => ({
    queries: context.batches.map(batch => pipelineQueries.ofProjects(context.workspaceId, batch)),
  }));
</script>

<!-- Draws nothing: it reads the pipelines of the folded sections ahead. -->
