<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import { createQuery } from '@scylla/core-sdk';
  import { CopyableText } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { ProviderMark, userName } from '@shared/presentation/ui';
  import { formatTime } from '@shared/utils/date-utils.ts';
  import { userQueries } from '@base/features/user';
  import type { JobEntity, JobSource } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import {
    eventText,
    pullRequestLabel,
    refOf,
    shortSha,
  } from '@base/features/jobs/presentation/presenters/job-source.presenter.ts';
  import JobDetailsFact from './JobDetailsFact.svelte';
  import JobDetailsGroup from './JobDetailsGroup.svelte';

  interface Props {
    job: JobEntity;
    source: JobSource;
  }

  let { job, source }: Props = $props();

  const ref = $derived(refOf(source));
  const event = $derived(eventText(source));
  const decision = $derived(
    job.approval && job.approval.state !== 'waiting' ? job.approval : undefined,
  );
  const decider = createQuery(() => userQueries.byId(decision?.decidedBy));
  const decisionText = $derived.by(() => {
    if (!decision) return '';
    const time = formatTime(decision.decidedAt);
    const name = decider.data ? userName(decider.data) : '';
    if (decision.state === 'approved') {
      return t(name ? messages.approvedBy(name, time) : messages.approvedAt(time));
    }
    return t(name ? messages.rejectedBy(name, time) : messages.rejectedAt(time));
  });
</script>

<!-- A value on one line: cut when it is too long, whole in its tooltip. -->
{#snippet text(value: string, className = '')}
  <span title={value} class={cn('min-w-0 truncate', className)}>{value}</span>
{/snippet}

{#snippet link(href: string, value: string, className = '')}
  {#if href}
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      title={value}
      class={cn('min-w-0 truncate underline-offset-4 hover:underline', className)}
    >
      {value}
    </a>
  {:else}
    {@render text(value, className)}
  {/if}
{/snippet}

<!-- The commit of the job, one fact after the other. Each item links to the provider. -->
<JobDetailsGroup title={t(messages.source)}>
  <JobDetailsFact label={t(messages.repository)}>
    <ProviderMark kind={source.provider} class="size-3.5 shrink-0 text-foreground" />
    {#if source.repositoryUrl}
      <a
        href={source.repositoryUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={source.repository}
        class="inline-flex min-w-0 items-center gap-1 font-mono underline-offset-4 hover:underline"
      >
        <span class="truncate">{source.repository}</span>
        <ExternalLinkIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      </a>
    {:else}
      {@render text(source.repository, 'font-mono')}
    {/if}
  </JobDetailsFact>

  {#if ref}
    <JobDetailsFact label={t(ref.kind === 'tag' ? messages.tag : messages.branch)}>
      {@render text(ref.name, 'max-w-60 font-mono')}
    </JobDetailsFact>
  {/if}

  <JobDetailsFact label={t(messages.commit)}>
    <CopyableText
      value={source.sha}
      display={shortSha(source.sha)}
      copyLabel={t(messages.copySha)}
      class="shrink-0 gap-0.5"
      copyButtonClass="size-5"
    />
    {#if source.title}
      {@render link(source.commitUrl, source.title, 'max-w-64')}
    {/if}
  </JobDetailsFact>

  {#each source.pullRequests as pullRequest (pullRequest.number)}
    <JobDetailsFact
      label={t(source.provider === 'gitlab' ? messages.mergeRequest : messages.pullRequest)}
    >
      {@render link(
        pullRequest.url,
        pullRequestLabel(source.provider, pullRequest.number),
        'shrink-0 font-mono',
      )}
      {#if pullRequest.title}
        {@render text(pullRequest.title, 'max-w-48')}
      {/if}
    </JobDetailsFact>
  {/each}

  {#if source.authorLogin}
    <JobDetailsFact label={t(messages.author)}>
      {#if source.authorAvatarUrl}
        <img
          src={source.authorAvatarUrl}
          alt=""
          class="size-4 shrink-0 rounded-full"
          referrerpolicy="no-referrer"
        />
      {/if}
      {@render text(source.authorLogin, 'font-mono')}
    </JobDetailsFact>
  {/if}

  {#if source.fromFork}
    <JobDetailsFact label={t(messages.fork)}>
      <GitForkIcon class="size-3.5 shrink-0 text-warning" aria-hidden="true" />
      {@render text(source.forkRepository, 'font-mono')}
    </JobDetailsFact>
    <JobDetailsFact label={t(messages.secrets)}>
      <EyeOffIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="truncate">{t(messages.secretsWithheld)}</span>
    </JobDetailsFact>
  {/if}

  {#if event}
    <JobDetailsFact label={t(messages.event)}>
      {@render text(event)}
    </JobDetailsFact>
  {/if}

  {#if job.pipelineFile}
    <JobDetailsFact label={t(messages.pipeline)}>
      {@render link(
        job.pipelineFile.url,
        t(messages.fileAtCommit(job.pipelineFile.path, shortSha(job.pipelineFile.commitSha))),
        'max-w-72 font-mono',
      )}
    </JobDetailsFact>
  {/if}

  {#if decision}
    <JobDetailsFact label={t(messages.approval)}>
      {@render text(decisionText)}
    </JobDetailsFact>
  {/if}
</JobDetailsGroup>
