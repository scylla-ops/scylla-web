<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { StatusShape } from '@scylla/ui';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { formatDuration, getRelativeTime } from '@shared/utils/date-utils.ts';
  import { toStatusState } from '@shared/utils/job-status.utils.ts';
  import { getStatusConfig } from '@shared/utils/status-config.ts';
  import { jobRunMessages as messages } from '@base/shared/presentation/messages/job-run.messages.ts';
  import { jobShortId, type JobRun } from '@shared/presentation/presenters/job-run.presenter.ts';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'onclick'> & {
    run: JobRun;
    /** In seconds. `null` before the start. */
    duration: number | null;
    /**
     * The page of the job: the mark is a link, and a middle click opens a new tab. `onSelect`
     * then runs before the router follows the link.
     */
    href?: string;
    onSelect?: (event: MouseEvent) => void;
    children?: Snippet;
  };

  let { run, duration, href, onSelect, class: className, children, ...rest }: Props = $props();

  const config = $derived(getStatusConfig(run.status));
  const status = $derived(t(config.label));
  const markClass = $derived(
    cn(
      'shrink-0 cursor-pointer transition-[scale] duration-150 outline-none hover:scale-y-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      className,
    ),
  );
</script>

<Tooltip delayDuration={100}>
  <TooltipTrigger>
    {#snippet child({ props })}
      {#if href}
        <a
          {...props}
          {...rest}
          {href}
          aria-label={t(messages.jobMark(jobShortId(run.id), status))}
          data-item-id={run.id}
          onclick={event => {
            (props.onclick as ((event: MouseEvent) => void) | undefined)?.(event);
            onSelect?.(event);
          }}
          class={markClass}
        >
          {@render children?.()}
        </a>
      {:else}
        <button
          {...props}
          {...rest}
          type="button"
          aria-label={t(messages.jobMark(jobShortId(run.id), status))}
          data-item-id={run.id}
          onclick={event => {
            (props.onclick as ((event: MouseEvent) => void) | undefined)?.(event);
            event.stopPropagation();
            onSelect?.(event);
          }}
          class={markClass}
        >
          {@render children?.()}
        </button>
      {/if}
    {/snippet}
  </TooltipTrigger>
  <TooltipContent
    side="top"
    sideOffset={4}
    arrow={false}
    class="w-62 border border-border bg-popover p-3 text-popover-foreground shadow-lg"
  >
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-4">
        <span class="font-mono font-medium text-foreground">{jobShortId(run.id)}</span>
        {#if run.ref}
          <span class="max-w-30 truncate font-mono text-[10px] text-muted-foreground">{run.ref}</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <StatusShape state={toStatusState(run.status)} label={status} size={16} />
        <span class={cn('font-semibold', config.textClassName)}>{status}</span>
      </div>
      {#if run.title}
        <span class="truncate text-muted-foreground">{run.title}</span>
      {/if}
      <span class="mt-1 border-t pt-1 text-[10px] text-muted-foreground italic">
        {run.finishedAt
          ? t(messages.finishedAt(getRelativeTime(run.finishedAt)))
          : t(messages.startedAt(getRelativeTime(run.startedAt ?? run.createdAt)))}
        {#if duration !== null}
          • {t(messages.durationOf(formatDuration(duration)))}
        {/if}
      </span>
    </div>
  </TooltipContent>
</Tooltip>
