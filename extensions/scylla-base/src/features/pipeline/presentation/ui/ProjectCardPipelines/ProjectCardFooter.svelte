<script lang="ts">
  import ClockIcon from '@lucide/svelte/icons/clock';
  import { createNow } from '@scylla/ui/state';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    formatCoarseDuration,
    formatUpcomingTime,
    getRelativeTime,
  } from '@shared/utils/date-utils.ts';
  import type { ProjectCardContext } from '@base/features/project';
  import { projectCardMessages } from '../../messages/project-card.messages.ts';
  import { createProjectCardPipelines } from './project-card-pipelines.state.svelte.ts';

  interface Props {
    context: ProjectCardContext;
  }

  let { context }: Props = $props();

  const card = createProjectCardPipelines(() => context);
  // The times move with the clock, each 30 s.
  const now = createNow(() => card.pipelines.footer !== null, 30_000);

  const text = $derived.by(() => {
    const footer = card.pipelines.footer;
    switch (footer?.kind) {
      case 'running': {
        const seconds = (now.value - Date.parse(footer.since)) / 1000;
        return t(projectCardMessages.jobRunningFor(formatCoarseDuration(seconds)));
      }
      case 'last':
        return t(projectCardMessages.lastJob(getRelativeTime(footer.at, now.value)));
      case 'next':
        return t(projectCardMessages.nextJob(formatUpcomingTime(footer.at, now.value)));
      case 'none':
        return t(projectCardMessages.noJob);
      default:
        return null;
    }
  });
</script>

<!-- At the bottom of the card: the job that runs, or the last job. A row has it at its end, a tile
     under the name: no line above it. -->
{#if text}
  <p
    class={cn(
      'flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground',
      context.density === 'comfortable' && 'border-t pt-3',
      context.density === 'compact' && 'border-t pt-2',
      context.density === 'tiles' && 'justify-center',
    )}
    data-part="project-last-job"
  >
    <ClockIcon class="size-3 shrink-0" aria-hidden="true" />
    <span class="truncate">{text}</span>
  </p>
{/if}
