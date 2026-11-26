<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import { can, Permission } from '@platform/authz';
  import { scyllaHref, scyllaNavigate } from '@platform/context';
  import { Button, Skeleton } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectCardContext } from '@base/features/project';
  import { projectCardMessages } from '../../messages/project-card.messages.ts';
  import { createRunPipeline } from '../run-pipeline.state.svelte.ts';
  import ProjectCardPipelineRow from './ProjectCardPipelineRow.svelte';
  import { createProjectCardPipelines } from './project-card-pipelines.state.svelte.ts';

  interface Props {
    context: ProjectCardContext;
  }

  let { context }: Props = $props();

  const card = createProjectCardPipelines(() => context);
  const runner = createRunPipeline();
  // The times move with the clock, each 30 s.
  const now = createNow(() => card.pipelines.rows.length > 0, 30_000);

  const canRun = $derived(can(Permission.RUN_PIPELINE, { projectId: context.projectId }));
  const canCreate = $derived(can(Permission.CREATE_PIPELINE, { projectId: context.projectId }));

  const run = async (pipelineId: string) => {
    await runner.run(pipelineId);
    void card.refreshAfterRun();
  };

  const createPipeline = () => {
    card.enterProject();
    scyllaNavigate.goToCreatePipeline();
  };
</script>

<!-- The pipelines of the project: a click on a row opens its jobs, its button runs it. -->
{#if card.summaries.isPending}
  <div class="flex flex-col gap-0.5 rounded-lg bg-background p-1" aria-hidden="true">
    <Skeleton class="h-9 w-full rounded-md max-md:h-11" />
  </div>
{:else if card.summaries.isSuccess}
  {@const pipelines = card.pipelines}
  <div class="flex flex-col gap-0.5 rounded-lg bg-background p-1" data-part="project-pipelines">
    {#each pipelines.rows as row (row.id)}
      <ProjectCardPipelineRow
        {row}
        projectId={context.projectId}
        now={now.value}
        running={runner.isRunning(row.id)}
        onRun={canRun ? () => run(row.id) : undefined}
        onOpen={() => card.enterProject(row)}
      />
    {/each}
    {#if pipelines.more > 0}
      <a
        href={scyllaHref.project(context.projectId)}
        onclick={() => card.enterProject()}
        class="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-md:h-11"
      >
        {t(projectCardMessages.morePipelines(pipelines.more))}
        <ArrowRightIcon class="size-3" aria-hidden="true" />
      </a>
    {:else if pipelines.rows.length === 0}
      <div class="flex h-9 items-center justify-between gap-2 pr-1 pl-2 max-md:h-11">
        <span class="truncate text-xs text-muted-foreground">
          {t(projectCardMessages.noPipeline)}
        </span>
        {#if canCreate}
          <Button variant="ghost" size="xs" class="shrink-0 max-md:h-11" onclick={createPipeline}>
            {t(projectCardMessages.createPipeline)}
          </Button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
