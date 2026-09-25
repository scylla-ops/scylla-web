<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { Permission, can } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/shadcn';
  import { CopyableText, FeatureHeader } from '@scylla/ui';
  import { createFeatureSelection } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { jobMutations } from '../../jobs.queries.ts';
  import { jobsMessages } from '../jobs.messages.ts';

  interface Props {
    numberOfJobs: number;
    jobIds: string[];
    pipelineId: string;
    onRefresh: () => void;
    /** Given by the route's owner: running is a pipeline operation. */
    onRun?: () => Promise<void>;
  }

  let { numberOfJobs, jobIds, pipelineId, onRefresh, onRun }: Props = $props();

  const deleteJob = createMutation(() => jobMutations.remove(pipelineId));

  // A getter: the ids arrive later.
  const selection = createFeatureSelection('jobs', () => jobIds, {
    deleteItem: id => deleteJob.mutateAsync(id),
  });

  const canRun = $derived(can(Permission.RUN_PIPELINE));
  const canDelete = $derived(can(Permission.DELETE_JOB));
</script>

{#snippet pipelineIdLine()}
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground font-medium">
        {t(jobsMessages.pipelineIdLabel)}
      </span>
      <CopyableText value={pipelineId} class="text-sm text-muted-foreground font-medium" />
    </div>
  </div>
{/snippet}

{#snippet refreshAction()}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          size="icon"
          onclick={onRefresh}
          class="h-9 w-9 cursor-pointer transition-all hover:scale-110"
        >
          <RefreshCwIcon class="size-4" />
          <!-- A closed tooltip gives the button no name. -->
          <span class="sr-only">{t(jobsMessages.refresh)}</span>
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent>
      <p>{t(jobsMessages.refresh)}</p>
    </TooltipContent>
  </Tooltip>
{/snippet}

<div class="flex flex-col gap-3">
  <FeatureHeader
    count={numberOfJobs}
    label={t(jobsMessages.job)}
    pluralLabel={t(jobsMessages.jobs)}
    newLabel={t(jobsMessages.run)}
    onNew={onRun ? () => void onRun() : undefined}
    canNew={canRun}
    newDeniedReason={t(jobsMessages.runDenied)}
    {canDelete}
    deleteDeniedReason={t(jobsMessages.deleteDenied)}
    underLabel={pipelineIdLine}
    extraActions={refreshAction}
    {...selection.headerProps}
  />
</div>
