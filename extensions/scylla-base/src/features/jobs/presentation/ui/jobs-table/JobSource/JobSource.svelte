<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import CircleXIcon from '@lucide/svelte/icons/circle-x';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
  import HourglassIcon from '@lucide/svelte/icons/hourglass';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import TagIcon from '@lucide/svelte/icons/tag';
  import { t } from '@scylla/ui/i18n';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import type { JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import type { ReportTone } from '@base/features/jobs/presentation/presenters/job-report.presenter.ts';
  import {
    pullRequestLabel,
    refOf,
    shortSha,
  } from '@base/features/jobs/presentation/presenters/job-source.presenter.ts';

  interface Props {
    source: JobSource;
    /** How the report of the job goes. `null`: no report, or not read yet. */
    reportTone: ReportTone | null;
  }

  let { source, reportTone }: Props = $props();

  const ref = $derived(refOf(source));

  const CHIP =
    'inline-flex h-5 shrink-0 items-center gap-1 rounded-md border border-border px-1.5 font-mono text-xs text-foreground';

  const TONE_LABEL = {
    sent: messages.reportStateSent,
    waiting: messages.reportStateSent,
    sending: messages.reportStateSending,
    retrying: messages.reportStateRetrying,
    not_sent: messages.reportStateNotSent,
  } as const;
</script>

<!-- The commit of a job in one cell: SHA and title, then its ref, its pull requests, its author. -->
<div class="flex min-w-0 flex-col gap-1">
  <div class="flex min-w-0 items-center gap-2">
    <span class={CHIP}>{shortSha(source.sha)}</span>
    <span class="min-w-0 truncate text-sm text-foreground">{source.title}</span>
  </div>
  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
    {#if ref}
      <span class={CHIP}>
        {#if ref.kind === 'tag'}
          <TagIcon class="size-3" aria-hidden="true" />
        {:else if source.fromFork}
          <GitForkIcon class="size-3" aria-hidden="true" />
        {:else}
          <GitBranchIcon class="size-3" aria-hidden="true" />
        {/if}
        <span class="max-w-40 truncate">{ref.name}</span>
      </span>
    {/if}
    {#each source.pullRequests as pullRequest (pullRequest.number)}
      <span class={CHIP}>
        <GitPullRequestIcon class="size-3" aria-hidden="true" />
        {pullRequestLabel(source.provider, pullRequest.number)}
      </span>
    {/each}
    {#if source.authorLogin}
      <span class="inline-flex items-center" title={source.authorLogin}>
        {#if source.authorAvatarUrl}
          <img
            src={source.authorAvatarUrl}
            alt=""
            class="size-4 shrink-0 rounded-full"
            referrerpolicy="no-referrer"
          />
        {:else}
          <IdentityAvatar profile={{ username: source.authorLogin }} size={16} />
        {/if}
        <span class="sr-only">{source.authorLogin}</span>
      </span>
    {/if}
    {#if reportTone}
      <span
        class="inline-flex items-center"
        role="img"
        aria-label={t(TONE_LABEL[reportTone])}
        title={t(TONE_LABEL[reportTone])}
      >
        {#if reportTone === 'sent'}
          <CircleCheckIcon class="size-3.5 text-status-passed" aria-hidden="true" />
        {:else if reportTone === 'waiting'}
          <HourglassIcon class="size-3.5 text-status-running" aria-hidden="true" />
        {:else if reportTone === 'sending'}
          <LoaderCircleIcon class="size-3.5 animate-spin text-status-running" aria-hidden="true" />
        {:else if reportTone === 'retrying'}
          <ClockIcon class="size-3.5 text-status-running" aria-hidden="true" />
        {:else}
          <CircleXIcon class="size-3.5 text-status-failed" aria-hidden="true" />
        {/if}
      </span>
    {/if}
  </div>
</div>
