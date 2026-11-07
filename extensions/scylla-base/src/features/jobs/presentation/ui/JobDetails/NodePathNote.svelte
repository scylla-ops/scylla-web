<script lang="ts">
  import { activeLocale, t } from '@scylla/ui/i18n';
  import type {
    JobNode,
    JobNodeExecution,
  } from '@base/features/jobs/domain/entities/job.entity.ts';
  import type { JobPath } from '@base/features/jobs/presentation/presenters/job-path.presenter.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';

  interface Props {
    node: JobNode | undefined;
    execution: JobNodeExecution;
    path: JobPath;
  }

  let { node, execution, path }: Props = $props();

  const listOf = (items: string[]) =>
    new Intl.ListFormat(activeLocale(), { type: 'unit' }).format(items);
  const branch = $derived(path.errorBranches.get(execution.id) ?? []);
</script>

<!-- What the path of the job says about the node: the ports of a switch, where a failure went. -->
{#if node?.kind === 'switch' && execution.state === 'completed'}
  <p class="border-b border-border px-3 py-2 text-sm text-muted-foreground">
    {execution.ports.length
      ? t(jobsMessages.portsChosen(listOf(execution.ports)))
      : t(jobsMessages.noPortChosen)}
  </p>
{:else if execution.state === 'failed' && branch.length}
  <p class="border-b border-border px-3 py-2 text-sm text-muted-foreground">
    {t(jobsMessages.errorBranch(listOf(branch)))}
  </p>
{/if}
