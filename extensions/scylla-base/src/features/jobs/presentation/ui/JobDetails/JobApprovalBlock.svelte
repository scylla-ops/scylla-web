<script lang="ts">
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import PlayIcon from '@lucide/svelte/icons/play';
  import ShieldIcon from '@lucide/svelte/icons/shield';
  import { Button, buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    GitProvider,
    JobApproval,
  } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';

  interface Props {
    approval: JobApproval;
    provider?: GitProvider;
    /** Unset without the approval of a job (`APPROVE_JOB`): the block only tells who can. */
    onApprove?: () => void;
    onReject?: () => void;
    deciding?: boolean;
  }

  let { approval, provider, onApprove, onReject, deciding = false }: Props = $props();
</script>

<!-- A job from a fork waits here, at the place of the error of a job. -->
<div
  role="region"
  aria-label={t(messages.forkTitle)}
  class="flex items-center gap-2.5 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-2.5"
>
  <ShieldIcon class="size-4 shrink-0 text-warning" aria-hidden="true" />
  <div class="flex min-w-0 flex-col gap-1.5">
    <p class="text-sm font-medium text-foreground">{t(messages.forkTitle)}</p>
    <p class="text-xs text-foreground">{t(messages.forkBody)}</p>
    {#if approval.changesPipelineFiles}
      <p class="text-xs font-medium text-warning">{t(messages.forkChangesPipelineFiles)}</p>
    {/if}
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {#if onApprove && onReject}
        <Button size="sm" onclick={onApprove} disabled={deciding}>
          <PlayIcon aria-hidden="true" />
          {t(messages.approveAndRun)}
        </Button>
        <Button variant="outline" size="sm" onclick={onReject} disabled={deciding}>
          {t(messages.reject)}
        </Button>
      {/if}
      {#if approval.changesUrl}
        <a
          href={approval.changesUrl}
          target="_blank"
          rel="noopener noreferrer"
          class={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'px-0 has-[>svg]:px-0')}
        >
          {t(provider === 'gitlab' ? messages.viewChangesOnGitLab : messages.viewChangesOnGitHub)}
          <ExternalLinkIcon aria-hidden="true" />
        </a>
      {/if}
      <span class="text-xs text-muted-foreground">
        {t(onApprove ? messages.approveHint : messages.approveDenied)}
      </span>
    </div>
  </div>
</div>
