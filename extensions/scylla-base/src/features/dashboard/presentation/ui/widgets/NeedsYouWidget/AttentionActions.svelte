<script lang="ts">
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
  import { Permission, can } from '@platform/authz';
  import { contextStore } from '@platform/context';
  import { createMutation } from '@scylla/core-sdk';
  import { cn } from '@scylla/ui/utils';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { jobMutations } from '@base/features/jobs';
  import { widgetMessages } from '@base/features/dashboard/presentation/messages/widgets.messages.ts';
  import type { AttentionItem } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { openJob } from '../widget-navigation.ts';

  interface Props {
    item: AttentionItem;
    class?: string;
  }

  let { item, class: className }: Props = $props();

  const rerun = createMutation(() => jobMutations.rerun(item.pipelineId));
  const canRerun = $derived(item.kind !== 'approval' && !!item.projectId && can(Permission.CREATE_JOB));

  const onRerun = () => {
    contextStore.getState().setProject(item.projectId, item.projectName);
    rerun.mutate(item.jobId);
  };
</script>

<div class={cn('flex shrink-0 items-center gap-1.5', className)}>
  {#if canRerun}
    <Button variant="outline" size="xs" disabled={rerun.isPending} onclick={onRerun}>
      <RotateCwIcon aria-hidden="true" />
      {t(widgetMessages.rerun)}
    </Button>
  {/if}
  <Button variant="outline" size="xs" onclick={() => openJob(item)}>
    {t(item.kind === 'approval' ? widgetMessages.review : widgetMessages.logs)}
  </Button>
</div>
