<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
  import TagIcon from '@lucide/svelte/icons/tag';
  import TimerIcon from '@lucide/svelte/icons/timer';
  import UserIcon from '@lucide/svelte/icons/user';
  import type { LucideIcon } from '@scylla/ui';
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import {
    calculateExecutionDuration,
    formatDate,
    formatDuration,
  } from '@shared/utils/date-utils.ts';
  import { isActiveStatus } from '@shared/domain/structs/job-status.struct.ts';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { jobGitMessages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import { refOf, shortSha } from '@base/features/jobs/presentation/presenters/job-source.presenter.ts';
  import { createJobAgent } from './job-agent.state.svelte.ts';

  interface Props {
    job: JobEntity;
  }

  let { job }: Props = $props();

  // Ticks only while the job runs.
  const now = createNow(() => isActiveStatus(job.status));
  const agent = createJobAgent(() => job.agentId);

  const duration = $derived.by(() => {
    void now.value;
    return calculateExecutionDuration(job.startedAt, job.finishedAt);
  });
  const ref = $derived(job.source ? refOf(job.source) : null);
</script>

{#snippet fact(Icon: LucideIcon, label: string)}
  <Icon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
  <span class="sr-only">{label}</span>
{/snippet}

<!-- The facts of the job on one line, each with its icon; its label is for a screen reader. -->
<ul
  aria-label={t(jobsMessages.facts)}
  class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground"
>
  <li class="flex items-center gap-1.5" title={t(jobsMessages.duration)}>
    {@render fact(TimerIcon, t(jobsMessages.duration))}
    <span class="font-mono">{duration === null ? '-' : formatDuration(duration)}</span>
  </li>
  <li
    class="flex items-center gap-1.5"
    title={t(job.startedAt ? jobsMessages.startedPrefix : jobsMessages.createdPrefix)}
  >
    {@render fact(
      CalendarIcon,
      t(job.startedAt ? jobsMessages.startedPrefix : jobsMessages.createdPrefix),
    )}
    <span class="font-mono">{formatDate(job.startedAt ?? job.createdAt)}</span>
  </li>
  {#if job.agentId}
    <li class="flex min-w-0 items-center gap-1.5" title={t(jobsMessages.agent)}>
      <IdentityAvatar profile={agent.profile} kind="agent" size={16} />
      <span class="sr-only">{t(jobsMessages.agent)}</span>
      {#if agent.href}
        <a class="truncate font-mono hover:underline" href={agent.href}>{agent.name}</a>
      {:else}
        <span class="truncate font-mono">{agent.name}</span>
      {/if}
    </li>
  {/if}
  {#if ref}
    <li
      class="flex min-w-0 items-center gap-1.5"
      title={t(ref.kind === 'tag' ? jobGitMessages.tag : jobGitMessages.branch)}
    >
      {@render fact(
        ref.kind === 'tag' ? TagIcon : GitBranchIcon,
        t(ref.kind === 'tag' ? jobGitMessages.tag : jobGitMessages.branch),
      )}
      <span class="truncate font-mono">{ref.name}</span>
    </li>
  {/if}
  {#if job.source}
    <li class="flex min-w-0 items-center gap-1.5" title={t(jobGitMessages.commit)}>
      {@render fact(GitCommitHorizontalIcon, t(jobGitMessages.commit))}
      <span class="font-mono">{shortSha(job.source.sha)}</span>
      {#if job.source.title}
        <span class="max-w-80 truncate text-muted-foreground">{job.source.title}</span>
      {/if}
    </li>
    {#if job.source.authorLogin}
      <li class="flex items-center gap-1.5" title={t(jobGitMessages.author)}>
        {#if job.source.authorAvatarUrl}
          <img
            src={job.source.authorAvatarUrl}
            alt=""
            class="size-4 shrink-0 rounded-full"
            referrerpolicy="no-referrer"
          />
          <span class="sr-only">{t(jobGitMessages.author)}</span>
        {:else}
          {@render fact(UserIcon, t(jobGitMessages.author))}
        {/if}
        <span class="font-mono">{job.source.authorLogin}</span>
      </li>
    {/if}
  {/if}
</ul>
