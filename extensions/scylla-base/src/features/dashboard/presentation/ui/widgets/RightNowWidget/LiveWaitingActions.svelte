<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { createMutation } from '@scylla/core-sdk';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { jobMutations } from '@base/features/jobs';
  import { liveMessages as messages } from '@base/features/dashboard/presentation/messages/live.messages.ts';
  import type { WaitingRow } from '@base/features/dashboard/presentation/presenters/widget-rows.presenter.ts';
  import { jobLink, enterPlace } from '../widget-navigation.ts';

  interface Props {
    row: WaitingRow;
  }

  let { row }: Props = $props();

  const cancel = createMutation(() => jobMutations.cancel(row.pipelineId));
  const review = $derived(jobLink(row));
</script>

{#if row.reason === 'approval'}
  {#if review}
    <Button variant="outline" size="xs" href={review.href} onclick={review.place && enterPlace(review.place)}>
      {t(messages.review)}
    </Button>
  {/if}
{:else if can(Permission.UPDATE_JOB)}
  <Button variant="outline" size="xs" disabled={cancel.isPending} onclick={() => cancel.mutate(row.jobId)}>
    {t(messages.cancel)}
  </Button>
{/if}
