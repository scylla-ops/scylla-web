<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import PlugIcon from '@lucide/svelte/icons/plug';
  import { ChartDot } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';
  import type { ActivityLine } from '@base/features/dashboard/presentation/presenters/activity.presenter.ts';
  import { clockIn } from '@base/features/dashboard/presentation/presenters/zoned-day.presenter.ts';
  import type { LinkTarget } from '../widget-navigation.ts';
  import WidgetLink from '../parts/WidgetLink.svelte';

  interface Props {
    line: ActivityLine;
    /** The page of the subject of the event. */
    link: LinkTarget | null;
    timeZone: string;
    /** M and L: the job id and a longer detail. */
    wide?: boolean;
  }

  let { line, link, timeZone, wide = false }: Props = $props();
</script>

<li class="flex h-[22px] min-w-0 items-center gap-2">
  <span class="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
    {#if line.mark.kind === 'dot'}
      <span class="flex size-4 items-center justify-center rounded-full bg-muted"><ChartDot tone={line.mark.tone} /></span>
    {:else if line.mark.kind === 'person'}
      <span class="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">{line.mark.initial}</span>
    {:else if line.mark.kind === 'agent'}
      <span class={cn('flex size-4 items-center justify-center rounded-[4px]', line.mark.online ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
        <BotIcon class="size-3" />
      </span>
    {:else}
      <span class="flex size-4 items-center justify-center rounded-[4px] bg-muted text-muted-foreground"><PlugIcon class="size-3" /></span>
    {/if}
  </span>
  <WidgetLink {link} class={cn('shrink-0 truncate text-sm font-medium', !wide && 'max-w-[50%]')}>{line.title}</WidgetLink>
  {#if wide && line.job}<span class="shrink-0 font-mono text-xs text-muted-foreground">{line.job}</span>{/if}
  <span class="truncate text-xs text-muted-foreground">{line.detail}</span>
  <span class="ml-auto shrink-0 pl-2 font-mono text-xs text-muted-foreground tabular-nums">{clockIn(new Date(line.at), timeZone)}</span>
</li>
