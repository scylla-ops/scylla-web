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
  <dt class="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
    {text}
  </dt>
{/snippet}

{#snippet link(href: string, text: string, mono = true)}
  {#if href}
    <a
      {href}
      target="_blank"
      rel="noopener noreferrer"
      class="truncate text-xs text-foreground underline-offset-4 hover:underline {mono ? 'font-mono' : ''}"
    >
      {text}
    </a>
  {:else}
    <span class="truncate text-xs text-foreground {mono ? 'font-mono' : ''}">{text}</span>
  {/if}
{/snippet}

<!-- The commit of the job, one fact for each row. Each item links to the provider. -->
<section aria-label={t(messages.source)}>
  <dl class="flex flex-col gap-1.5">
    <div class="flex min-w-0 items-center gap-3">
      {@render label(t(messages.repository))}
      <dd class="flex min-w-0 items-center gap-1.5">
        <ProviderMark kind={source.provider} class="size-3.5 shrink-0 text-foreground" />
        {#if source.repositoryUrl}
          <a
            href={source.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-w-0 items-center gap-1 font-mono text-xs text-foreground underline-offset-4 hover:underline"
          >
            <span class="truncate">{source.repository}</span>
            <ExternalLinkIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          </a>
        {:else}
          <span class="truncate font-mono text-xs text-foreground">{source.repository}</span>
        {/if}
      </dd>
    </div>

    {#if ref}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(ref.kind === 'tag' ? messages.tag : messages.branch))}
        <dd class="min-w-0 truncate font-mono text-xs text-foreground">{ref.name}</dd>
      </div>
    {/if}

    <div class="flex min-w-0 items-center gap-3">
      {@render label(t(messages.commit))}
      <dd class="flex min-w-0 items-center gap-1.5">
        <CopyableText
          value={source.sha}
          display={shortSha(source.sha)}
          copyLabel={t(messages.copySha)}
          class="font-mono text-xs"
        />
        {#if source.title}
          {@render link(source.commitUrl, source.title, false)}
        {/if}
      </dd>
    </div>

    {#each source.pullRequests as pullRequest (pullRequest.number)}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(source.provider === 'gitlab' ? messages.mergeRequest : messages.pullRequest))}
        <dd class="flex min-w-0 items-center gap-1.5">
          {@render link(pullRequest.url, pullRequestLabel(source.provider, pullRequest.number))}
          {#if pullRequest.title}
            <span class="truncate text-xs text-foreground">{pullRequest.title}</span>
          {/if}
        </dd>
      </div>
    {/each}

    {#if source.authorLogin}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.author))}
        <dd class="flex min-w-0 items-center gap-1.5">
          {#if source.authorAvatarUrl}
            <img
              src={source.authorAvatarUrl}
              alt=""
              class="size-4 shrink-0 rounded-full"
              referrerpolicy="no-referrer"
            />
          {/if}
          <span class="truncate font-mono text-xs text-foreground">{source.authorLogin}</span>
        </dd>
      </div>
    {/if}

    {#if source.fromFork}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.fork))}
        <dd class="flex min-w-0 items-center gap-1.5">
          <GitForkIcon class="size-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span class="truncate font-mono text-xs text-foreground">{source.forkRepository}</span>
        </dd>
      </div>
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.secrets))}
        <dd class="flex min-w-0 items-center gap-1.5">
          <EyeOffIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="font-mono text-xs text-foreground">{t(messages.secretsWithheld)}</span>
        </dd>
      </div>
    {/if}

    {#if event}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.event))}
        <dd class="min-w-0 truncate text-xs text-foreground">{event}</dd>
      </div>
    {/if}

    {#if job.pipelineFile}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.pipeline))}
        <dd class="flex min-w-0 items-center">
          {@render link(
            job.pipelineFile.url,
            t(messages.fileAtCommit(job.pipelineFile.path, shortSha(job.pipelineFile.commitSha))),
          )}
        </dd>
      </div>
    {/if}

    {#if decision}
      <div class="flex min-w-0 items-center gap-3">
        {@render label(t(messages.approval))}
        <dd class="min-w-0 text-xs text-foreground">{decisionText}</dd>
      </div>
    {/if}
  </dl>
</section>
