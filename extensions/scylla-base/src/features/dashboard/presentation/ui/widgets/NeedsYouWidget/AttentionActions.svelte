<script lang="ts">
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import { Permission, can } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { cn } from '@scylla/ui/utils';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { jobMutations } from '@base/features/jobs';
  import { triggerMutations } from '@base/features/triggers';
  import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
  import { shortJobId } from '@base/features/dashboard/presentation/presenters/job-figures.presenter.ts';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import { openAgent, openJob, openTriggers } from '../widget-navigation.ts';

  interface Props {
    item: AttentionItem;
    class?: string;
  }

  let { item, class: className }: Props = $props();

  const rerun = createMutation(() => jobMutations.rerun(item.pipelineId));
  const fireNow = createMutation(() => triggerMutations.fireNow(item.pipelineId));

  const job = $derived(item.job && item.projectId ? item.job : null);
  const fire = $derived(item.fire && item.projectId ? item.fire : null);
  const canRerun = $derived(
    !!job && item.kind !== 'approval-waiting' && can(Permission.CREATE_JOB),
  );
  const canFire = $derived(!!fire && can(Permission.MANAGE_TRIGGERS));

  const enterProject = () => contextStore.getState().setProject(item.projectId, item.projectName);

  const place = (jobId: string) => ({
    jobId,
    shortId: shortJobId(jobId),
    pipelineId: item.pipelineId,
    pipelineName: item.pipelineName,
    projectId: item.projectId,
    projectName: item.projectName,
  });
</script>

<div class={cn('flex shrink-0 items-center gap-1.5', className)}>
  {#if job}
    {#if canRerun}
      <Button
        variant="outline"
        size="xs"
        disabled={rerun.isPending}
        onclick={() => {
          enterProject();
          rerun.mutate(job.id);
        }}
      >
        <RotateCwIcon aria-hidden="true" />
        {t(widgetMessages.rerun)}
      </Button>
    {/if}
    <Button variant="outline" size="xs" onclick={() => openJob(place(job.id))}>
      {t(item.kind === 'approval-waiting' ? widgetMessages.review : widgetMessages.logs)}
    </Button>
  {:else if fire}
    {#if canFire}
      <Button
        variant="outline"
        size="xs"
        disabled={fireNow.isPending}
        onclick={() => {
          enterProject();
          fireNow.mutate(fire.triggerId);
        }}
      >
        {t(widgetMessages.fireNow)}
      </Button>
    {/if}
    <Button variant="outline" size="xs" onclick={() => openTriggers(item)}>
      {t(widgetMessages.trigger)}
    </Button>
  {:else if item.agent}
    {@const agentId = item.agent.id}
    <Button variant="outline" size="xs" onclick={() => openAgent(agentId)}>
      {t(widgetMessages.agent)}
    </Button>
  {/if}
</div>
