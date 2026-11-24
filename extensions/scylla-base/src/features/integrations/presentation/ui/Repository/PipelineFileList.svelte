<script lang="ts">
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import FileCodeIcon from '@lucide/svelte/icons/file-code';
  import { Badge, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    blockingIssues,
    type PipelineFiles,
  } from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';
  import { pipelineSourceMessages as messages } from '@base/features/integrations/presentation/messages/pipeline-source.messages.ts';
  import {
    filesHeading,
    lookupIssueText,
    pipelineFileRow,
  } from '@base/features/integrations/presentation/presenters/pipeline-files.presenter.ts';

  interface Props {
    /** Absent while the server reads the files. */
    files: PipelineFiles | undefined;
    failed: boolean;
    /** The default branch. */
    branch: string;
  }

  let { files, failed, branch }: Props = $props();

  const rows = $derived(files?.files.map(pipelineFileRow) ?? []);
  const lookup = $derived(files ? blockingIssues(files.issues).map(lookupIssueText) : []);
</script>

{#if failed && !files}
  <p class="flex items-center gap-2 text-xs text-muted-foreground" role="alert">
    <CircleAlertIcon class="size-3.5 shrink-0 text-warning" aria-hidden="true" />
    {t(messages.readFailed(branch))}
  </p>
{:else if !files}
  <div class="flex flex-col gap-2" aria-hidden="true">
    <Skeleton class="h-4 w-40" />
    <Skeleton class="h-5 w-full" />
  </div>
{:else}
  <div class="flex flex-col gap-2">
    <p class="text-xs font-medium text-muted-foreground">{filesHeading(files, branch)}</p>
    {#if rows.length > 0}
      <ul class="flex flex-col gap-1.5" aria-label={t(messages.files)}>
        {#each rows as row (row.path)}
          <li class="flex flex-wrap items-center gap-x-2 gap-y-1" data-valid={row.valid}>
            <span class="flex min-w-0 items-center gap-2">
              <FileCodeIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 font-mono text-xs break-all">{row.path}</span>
            </span>
            <Badge
              variant="outline"
              class={row.valid ? '[&>svg]:text-success' : '[&>svg]:text-destructive'}
            >
              {#if row.valid}
                <CircleCheckIcon aria-hidden="true" />
              {:else}
                <CircleAlertIcon aria-hidden="true" />
              {/if}
              {row.badge}
            </Badge>
            <span class="min-w-0 grow basis-24 text-xs text-muted-foreground">{row.detail}</span>
          </li>
        {/each}
      </ul>
    {/if}
    {#each lookup as issue (issue)}
      <p class="flex items-center gap-2 text-xs text-muted-foreground">
        <CircleAlertIcon class="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
        <span class="min-w-0">{issue}</span>
      </p>
    {/each}
  </div>
{/if}
