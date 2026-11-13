<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import GitForkIcon from '@lucide/svelte/icons/git-fork';
  import { createQuery } from '@scylla/core-sdk';
  import { CopyableText } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
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

{#snippet label(text: string)}
  <span class="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{text}</span>
{/snippet}

{#snippet separator()}
  <span class="text-muted-foreground/50" aria-hidden="true">·</span>
{/snippet}

{#snippet link(href: string, text: string, mono = true)}
  {#if href}
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      class="text-xs text-foreground underline-offset-4 hover:underline {mono ? 'font-mono' : ''}"
    >
      {text}
    </a>
  {:else}
    <span class="text-xs text-foreground {mono ? 'font-mono' : ''}">{text}</span>
  {/if}
{/snippet}

<!-- The commit of the job, in the style of the facts above it. Each item links to the provider. -->
<section
  aria-label={t(messages.source)}
  class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-3.5 py-2"
>
  <span class="flex items-center gap-1.5">
    {@render label(t(messages.repository))}
    <ProviderMark kind={source.provider} class="size-3.5 shrink-0 text-foreground" />
    {#if source.repositoryUrl}
      <a
        href={source.repositoryUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 font-mono text-xs text-foreground underline-offset-4 hover:underline"
      >
        {source.repository}
        <ExternalLinkIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      </a>
    {:else}
      <span class="font-mono text-xs text-foreground">{source.repository}</span>
    {/if}
  </span>

  {#if ref}
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(ref.kind === 'tag' ? messages.tag : messages.branch))}
      <span class="font-mono text-xs text-foreground">{ref.name}</span>
    </span>
  {/if}

  {@render separator()}
  <span class="flex min-w-0 items-center gap-1.5">
    {@render label(t(messages.commit))}
    <CopyableText
      value={source.sha}
      display={shortSha(source.sha)}
      copyLabel={t(messages.copySha)}
      class="font-mono text-xs"
    />
    {#if source.title}
      {@render link(source.commitUrl, source.title, false)}
    {/if}
  </span>

  {#each source.pullRequests as pullRequest (pullRequest.number)}
    {@render separator()}
    <span class="flex min-w-0 items-center gap-1.5">
      {@render label(t(source.provider === 'gitlab' ? messages.mergeRequest : messages.pullRequest))}
      {@render link(pullRequest.url, pullRequestLabel(source.provider, pullRequest.number))}
      {#if pullRequest.title}
        <span class="truncate text-xs text-foreground">{pullRequest.title}</span>
      {/if}
    </span>
  {/each}

  {#if source.authorLogin}
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(messages.author))}
      {#if source.authorAvatarUrl}
        <img
          src={source.authorAvatarUrl}
          alt=""
          class="size-4 shrink-0 rounded-full"
          referrerpolicy="no-referrer"
        />
      {/if}
      <span class="font-mono text-xs text-foreground">{source.authorLogin}</span>
    </span>
  {/if}

  {#if source.fromFork}
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(messages.fork))}
      <GitForkIcon class="size-3.5 shrink-0 text-warning" aria-hidden="true" />
      <span class="font-mono text-xs text-foreground">{source.forkRepository}</span>
    </span>
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(messages.secrets))}
      <EyeOffIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="font-mono text-xs text-foreground">{t(messages.secretsWithheld)}</span>
    </span>
  {/if}

  {#if event}
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(messages.event))}
      <span class="text-xs text-foreground">{event}</span>
    </span>
  {/if}

  {#if job.pipelineFile}
    {@render separator()}
    <span class="flex min-w-0 items-center gap-1.5">
      {@render label(t(messages.pipeline))}
      {@render link(
        job.pipelineFile.url,
        t(messages.fileAtCommit(job.pipelineFile.path, shortSha(job.pipelineFile.commitSha))),
      )}
    </span>
  {/if}

  {#if decision}
    {@render separator()}
    <span class="flex items-center gap-1.5">
      {@render label(t(messages.approval))}
      <span class="text-xs text-foreground">{decisionText}</span>
    </span>
  {/if}
</section>
