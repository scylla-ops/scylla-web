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
  import { Button, buttonVariants } from '@scylla/ui/primitives';
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

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  /** A report changes while its job runs or while a call waits: read it again. */
  const POLL_MS = 3000;

  // A job with no commit has no report: no call.
  const reportsQuery = createQuery(() => ({
    ...vcsReportQueries.byJobs([job.id], !!job.source),
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

{#snippet label()}
  <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
    {t(messages.report)}
  </span>
{/snippet}

<!-- The reports of the job to the provider, under its commit. A job with no commit shows none. -->
{#if entry && job.source}
  <section aria-label={t(messages.report)} class="flex flex-col gap-1.5">
    {#if entry.reports.length === 0}
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-3.5 py-2"
      >
        {@render label()}
        <span class="text-xs font-medium text-foreground">{t(messages.notReported)}</span>
        <span class="text-xs text-muted-foreground">{noReportText(entry)}</span>
      </div>
    {/if}
    {#each entry.reports as report (report.context)}
      {@const line = lineOf(report)}
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-3.5 py-2"
      >
        {@render label()}
        <span class="flex items-center gap-1.5">
          <ProviderMark kind={report.provider} class="size-3.5 shrink-0 text-foreground" />
          <span class="font-mono text-xs text-foreground">{reportTitle(report)}</span>
        </span>
        <span class="text-muted-foreground/50" aria-hidden="true">·</span>
        <span class="flex items-center gap-1.5">
          {@render toneIcon(line.tone)}
          <span class="text-xs font-medium text-foreground">{line.text}</span>
        </span>
        {#if line.detail}
          <span class="min-w-0 text-xs break-words text-muted-foreground">{line.detail}</span>
        {/if}
        <span class="ml-auto flex items-center gap-2">
          {#if (report.state === 'retrying' || report.state === 'not_sent') && canRetry}
            <Button
              variant="outline"
              size="xs"
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
              class={cn(buttonVariants({ variant: 'link', size: 'xs' }))}
            >
              {t(report.provider === 'gitlab' ? messages.viewOnGitLab : messages.viewOnGitHub)}
              <ExternalLinkIcon aria-hidden="true" />
            </a>
          {/if}
        </span>
      </div>
    {/each}
  </section>
{/if}
