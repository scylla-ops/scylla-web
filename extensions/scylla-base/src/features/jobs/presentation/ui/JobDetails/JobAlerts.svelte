<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import { t } from '@scylla/ui/i18n';
  import type { JobEntity } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobsMessages } from '@base/features/jobs/presentation/messages/jobs.messages.ts';
  import { hasInvalidFile } from '@base/features/jobs/presentation/presenters/job-status.presenter.ts';
  import { createJobAgent } from './job-agent.state.svelte.ts';
  import InvalidFileAlert from './InvalidFileAlert.svelte';
  import JobApprovalBlock from './JobApprovalBlock.svelte';
  import UnfitAgentsAlert from './UnfitAgentsAlert.svelte';

  interface Props {
    job: JobEntity;
    /** Unset without `APPROVE_JOB`. */
    onApprove?: () => void;
    onReject?: () => void;
    isDeciding?: boolean;
  }

  let { job, onApprove, onReject, isDeciding = false }: Props = $props();

  const agent = createJobAgent(() => job.agentId);
</script>

<!-- What the job waits for, or why it stopped: between the header and the log. -->
{#if job.status === 'awaiting_approval' && job.approval}
  <JobApprovalBlock
    approval={job.approval}
    provider={job.source?.provider}
    {onApprove}
    {onReject}
    deciding={isDeciding}
  />
{/if}

{#if job.status === 'pending' && job.unfitAgents}
  <UnfitAgentsAlert agents={job.unfitAgents} agentHref={agent.hrefOf} />
{/if}

{#if hasInvalidFile(job) && job.fileErrors}
  <InvalidFileAlert errors={job.fileErrors} file={job.pipelineFile} />
{:else if job.error}
  <div
    role="alert"
    class="flex shrink-0 items-center gap-2.5 rounded-md border border-destructive/40 bg-destructive-subtle px-3.5 py-2.5"
  >
    <CircleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
    <div class="min-w-0">
      <p class="text-sm font-medium text-foreground">{t(jobsMessages.jobFailed)}</p>
      <p class="mt-0.5 font-mono text-xs break-words text-foreground">{job.error}</p>
    </div>
  </div>
{/if}
