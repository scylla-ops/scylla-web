<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { buttonVariants } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    PipelineFileError,
    PipelineFileRef,
  } from '@base/features/jobs/domain/entities/job.entity.ts';
  import { jobGitMessages as messages } from '@base/features/jobs/presentation/messages/job-git.messages.ts';
  import { fileErrorPlace } from '@base/features/jobs/presentation/presenters/job-file.presenter.ts';
  import { shortSha } from '@base/features/jobs/presentation/presenters/job-source.presenter.ts';

  interface Props {
    errors: PipelineFileError[];
    file?: PipelineFileRef;
  }

  let { errors, file }: Props = $props();
</script>

<!-- The job failed before its first node: the place of each error replaces the reason of a failure. -->
<div
  role="alert"
  class="flex items-center gap-2.5 rounded-md border border-destructive/40 bg-destructive-subtle px-3.5 py-2.5"
>
  <CircleAlertIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
  <div class="flex min-w-0 flex-col gap-1">
    <p class="text-sm font-medium text-foreground">{t(messages.invalidFile)}</p>
    <ul class="flex flex-col gap-0.5">
      {#each errors as error, index (index)}
        <li class="flex flex-wrap items-center gap-x-3 font-mono text-xs break-words text-foreground">
          {#if fileErrorPlace(error)}
            <span>{fileErrorPlace(error)}</span>
          {/if}
          <span>
            {error.field ? `${error.field}: ${error.message}` : error.message}
          </span>
          {#if error.warning}
            <span class="font-sans text-muted-foreground">{t(messages.fileWarning)}</span>
          {/if}
        </li>
      {/each}
    </ul>
    {#if file?.url}
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(buttonVariants({ variant: 'link', size: 'xs' }), 'w-fit px-0 has-[>svg]:px-0')}
      >
        {t(messages.viewFileAt(shortSha(file.commitSha)))}
        <ExternalLinkIcon aria-hidden="true" />
      </a>
    {/if}
  </div>
</div>
