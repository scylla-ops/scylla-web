<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import HourglassIcon from '@lucide/svelte/icons/hourglass';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { Permission, can } from '@platform/authz';
  import { activeWorkspaceSlug, contextStore } from '@platform/context';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Badge, Button, buttonVariants } from '@scylla/ui/primitives';
  import { createNow } from '@scylla/ui/state';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ProviderMark } from '@shared/presentation/ui';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import {
    integrationsUrl,
    vcsReportMutations,
    vcsReportQueries,
    type JobReports,
    type VcsReport,
  } from '@base/features/integrations';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import {
    noReportText,
    reportLine,
    reportTitle,
    type ReportTone,
  } from '@base/features/jobs/presentation/presenters/job-report.presenter.ts';
  import JobDetailsGroup from './JobDetailsGroup.svelte';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  /** A report changes while its job runs or while a call waits: read it again. */
  const POLL_MS = 3000;

  // A job with no commit has no report: no call. The status of the job is the version of its
  // reports: at the end of the job, the reports are read again at once, and the poll does not
  // stop on a read from before the end. The old reports stay on the screen until the new read.
  const reportsQuery = createQuery(() => ({
    ...vcsReportQueries.byJobs([job.id], !!job.source, job.status),
    placeholderData: (previous: JobReports[] | undefined) => previous,
    refetchInterval: query => {
      const open = query.state.data?.some(entry =>
        entry.reports.some(report => report.state === 'sending' || report.state === 'retrying'),
      );
      return open || isActiveStatus(job.status) || job.status === 'awaiting_approval'
        ? POLL_MS
        : false;
    },
  }));
  const entry = $derived(reportsQuery.data?.find(reports => reports.jobId === job.id));

  const retry = createMutation(() => vcsReportMutations.retry());

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id ?? '');
  const canRetry = $derived(can(Permission.UPDATE_JOB));
  const canFixConnection = $derived(can(Permission.VIEW_INTEGRATIONS, { workspaceId }));

  const counting = $derived(entry?.reports.some(report => report.state === 'retrying') ?? false);
  const now = createNow(() => counting);

  const TONE_CLASS: Record<ReportTone, string> = {
    sent: 'text-status-passed',
    waiting: 'text-status-running',
    sending: 'text-status-running',
    retrying: 'text-status-running',
    not_sent: 'text-status-failed',
  };

  const lineOf = (report: VcsReport) => reportLine(report, job.source?.sha ?? '', now.value);
</script>

{#snippet toneIcon(tone: ReportTone)}
  {#if tone === 'sent'}
    <CircleCheckIcon class="size-3.5 shrink-0 {TONE_CLASS[tone]}" aria-hidden="true" />
  {:else if tone === 'waiting'}
    <HourglassIcon class="size-3.5 shrink-0 {TONE_CLASS[tone]}" aria-hidden="true" />
  {:else if tone === 'sending'}
    <LoaderCircleIcon class="size-3.5 shrink-0 animate-spin {TONE_CLASS[tone]}" aria-hidden="true" />
  {:else if tone === 'retrying'}
    <ClockIcon class="size-3.5 shrink-0 {TONE_CLASS[tone]}" aria-hidden="true" />
  {:else}
    <CircleXIcon class="size-3.5 shrink-0 {TONE_CLASS[tone]}" aria-hidden="true" />
  {/if}
{/snippet}

<!--
  The reports of the job to the provider, in the details: a chip for each report, then its
  state, its detail and its actions on the same line. A job with no commit shows none.
-->
{#if entry && job.source}
  <JobDetailsGroup title={t(messages.report)} as="ul">
    {#if entry.reports.length === 0}
      <li class="flex min-h-5 max-w-full min-w-0 items-center gap-2 text-xs">
        <span class="shrink-0 font-medium text-foreground">{t(messages.notReported)}</span>
        <span class="truncate text-muted-foreground" title={noReportText(entry)}>
          {noReportText(entry)}
        </span>
      </li>
    {/if}
    {#each entry.reports as report (report.context)}
      {@const line = lineOf(report)}
      <li class="flex max-w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Badge variant="outline" class="h-5 max-w-full min-w-0 shrink gap-1.5 font-normal">
          <ProviderMark kind={report.provider} class="size-3 shrink-0 text-foreground" />
          <span class="truncate font-mono">{reportTitle(report)}</span>
        </Badge>
        <span class="flex h-5 max-w-full min-w-0 items-center gap-1.5">
          {@render toneIcon(line.tone)}
          <span class="truncate font-medium text-foreground">{line.text}</span>
        </span>
        {#if line.detail}
          <span class="max-w-full min-w-0 truncate text-muted-foreground" title={line.detail}>
            {line.detail}
          </span>
        {/if}
        {#if (report.state === 'retrying' || report.state === 'not_sent') && canRetry}
          <Button
            variant="outline"
            size="xs"
            class="h-5"
            disabled={retry.isPending}
            onclick={() => retry.mutate({ jobId: job.id, context: report.context })}
          >
            <RotateCcwIcon aria-hidden="true" />
            {t(messages.retryNow)}
          </Button>
        {/if}
        {#if report.state === 'not_sent' && canFixConnection}
          <Button
            variant="link"
            size="xs"
            class="h-5 px-0"
            href={integrationsUrl(activeWorkspaceSlug() ?? '')}
          >
            {t(messages.fixConnection)}
          </Button>
        {/if}
        {#if report.externalUrl}
          <a
            href={report.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            class={cn(buttonVariants({ variant: 'link', size: 'xs' }), 'h-5 px-0')}
          >
            {t(report.provider === 'gitlab' ? messages.viewOnGitLab : messages.viewOnGitHub)}
            <ExternalLinkIcon aria-hidden="true" />
          </a>
        {/if}
      </li>
    {/each}
  </JobDetailsGroup>
{/if}
