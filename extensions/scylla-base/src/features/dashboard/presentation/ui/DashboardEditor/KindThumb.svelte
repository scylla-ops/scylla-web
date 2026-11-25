<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { WidgetKind } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';

  interface Props {
    kind: WidgetKind;
    class?: string;
  }

  let { kind, class: className }: Props = $props();

  // A small picture of what each widget shows. Each kind has its own art, drawn in a 44 x 24 box with the tokens of the widgets.
  const TICKS = [
    [2, 8, 'passed'], [5, 11, 'passed'], [8, 7, 'passed'], [11, 13, 'passed'], [14, 9, 'failed'], [17, 12, 'passed'],
    [20, 6, 'passed'], [23, 14, 'passed'], [26, 10, 'passed'], [29, 12, 'failed'], [32, 8, 'passed'],
  ] as const;
  const STACKS = [
    [8, 3], [11, 0], [9, 2], [13, 0], [10, 4], [12, 0], [7, 2],
  ] as const;
  const HEAT = [
    [0, 1, 2, 3, 1, 0, 2, 1],
    [1, 2, 4, 3, 2, 1, 0, 1],
    [0, 3, 4, 4, 3, 2, 1, 0],
    [0, 1, 2, 2, 1, 0, 0, 0],
  ] as const;
  const HEAT_FILL = ['fill-muted', 'fill-primary/30', 'fill-primary/55', 'fill-primary/80', 'fill-primary'] as const;
  const RANK = [26, 20, 14, 8] as const;
</script>

<span
  aria-hidden="true"
  data-kind={kind}
  class={cn(
    'flex h-7 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background',
    className,
  )}
>
  <svg viewBox="0 0 44 24" class="size-full" data-art={kind}>
    {#if kind === 'sentence'}
      <rect x="4" y="5" width="6" height="4" rx="1" class="fill-status-failed" />
      <rect x="12" y="5" width="20" height="4" rx="1" class="fill-foreground/50" />
      <rect x="4" y="11" width="36" height="2" rx="1" class="fill-muted-foreground/40" />
      <rect x="4" y="16" width="24" height="2" rx="1" class="fill-muted-foreground/40" />
    {:else if kind === 'list'}
      {#each [0, 1, 2] as row (row)}
        <circle cx="6" cy={6 + row * 6} r="1.6" class={row === 0 ? 'fill-status-failed' : 'fill-status-queued'} />
        <rect x="11" y={5 + row * 6} width={row === 1 ? 17 : 22} height="2" rx="1" class="fill-foreground/45" />
        <rect x="33" y={4.5 + row * 6} width="7" height="3" rx="1.5" class="fill-muted-foreground/35" />
      {/each}
    {:else if kind === 'timeline'}
      <line x1="2" y1="19" x2="42" y2="19" class="stroke-border" stroke-width="1" />
      {#each TICKS as [x, height, tone] (x)}
        <rect {x} y={19 - height} width="1.6" {height} rx="0.5" class={tone === 'failed' ? 'fill-status-failed' : 'fill-status-passed'} />
      {/each}
      <circle cx="37" cy="17" r="1.4" class="fill-status-running" />
      <circle cx="41" cy="17" r="1.4" class="fill-none stroke-foreground/60" stroke-width="0.8" />
    {:else if kind === 'ratio'}
      <circle cx="22" cy="12" r="7.5" class="fill-none stroke-muted" stroke-width="3" />
      <circle
        cx="22"
        cy="12"
        r="7.5"
        class="fill-none stroke-status-passed"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="42 47"
        transform="rotate(-90 22 12)"
      />
    {:else if kind === 'bars'}
      {#each STACKS as [done, failed], index (index)}
        <rect x={4 + index * 5.4} y={21 - done} width="3.6" height={done} rx="0.8" class="fill-status-passed" />
        {#if failed > 0}
          <rect x={4 + index * 5.4} y={21 - done - failed - 0.8} width="3.6" height={failed} rx="0.8" class="fill-status-failed" />
        {/if}
      {/each}
    {:else if kind === 'status-band'}
      <circle cx="8" cy="12" r="2.4" class="fill-status-running" />
      <rect x="13" y="8.5" width="6" height="7" rx="1.2" class="fill-foreground/60" />
      <circle cx="26" cy="12" r="2.4" class="fill-status-queued" />
      <rect x="31" y="8.5" width="6" height="7" rx="1.2" class="fill-foreground/60" />
    {:else if kind === 'capacity'}
      {#each [1, 1, 1, 0] as busy, index (index)}
        <rect x={5 + index * 6} y="5" width="4.5" height="4.5" rx="1" class={busy ? 'fill-primary' : 'fill-muted'} />
      {/each}
      <rect x="5" y="13" width="34" height="2.4" rx="1.2" class="fill-muted" />
      <rect x="5" y="13" width="20" height="2.4" rx="1.2" class="fill-status-passed" />
      <rect x="5" y="18" width="34" height="2.4" rx="1.2" class="fill-muted" />
      <rect x="5" y="18" width="11" height="2.4" rx="1.2" class="fill-status-passed" />
    {:else if kind === 'health'}
      {#each [0, 1, 2] as row (row)}
        <circle cx="6" cy={6 + row * 6} r="1.8" class={row === 1 ? 'fill-status-failed' : 'fill-status-passed'} />
        <rect x="11" y={5 + row * 6} width="16" height="2" rx="1" class="fill-foreground/45" />
        <rect x="31" y={5 + row * 6} width="9" height="2" rx="1" class="fill-muted-foreground/35" />
      {/each}
    {:else if kind === 'line'}
      <line x1="3" y1="20" x2="41" y2="20" class="stroke-border" stroke-width="1" />
      <polygon points="3,20 3,15 10,13 17,16 24,8 31,11 41,5 41,20" class="fill-info/20" />
      <polyline
        points="3,15 10,13 17,16 24,8 31,11 41,5"
        class="fill-none stroke-info"
        stroke-width="1.6"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    {:else if kind === 'ranking'}
      {#each RANK as width, row (row)}
        <text x="4" y={7 + row * 5} font-size="4" class="fill-muted-foreground" font-family="monospace">{row + 1}</text>
        <rect x="9" y={4.8 + row * 5} {width} height="2.4" rx="1.2" class={row === 0 ? 'fill-status-failed' : 'fill-primary/60'} />
        <rect x="37" y={4.8 + row * 5} width="4" height="2.4" rx="1.2" class="fill-muted-foreground/35" />
      {/each}
    {:else if kind === 'heatmap'}
      {#each HEAT as cells, row (row)}
        {#each cells as level, column (column)}
          <rect x={4 + column * 4.8} y={3.5 + row * 4.8} width="3.8" height="3.8" rx="0.8" class={HEAT_FILL[level]} />
        {/each}
      {/each}
    {:else if kind === 'triggers'}
      <circle cx="9" cy="12" r="5.5" class="fill-none stroke-primary" stroke-width="1.5" />
      <polyline points="9,8.5 9,12 11.5,13.5" class="fill-none stroke-primary" stroke-width="1.3" stroke-linecap="round" />
      <rect x="19" y="7" width="20" height="2" rx="1" class="fill-foreground/45" />
      <rect x="19" y="11.5" width="14" height="2" rx="1" class="fill-muted-foreground/35" />
      <rect x="19" y="16" width="17" height="2" rx="1" class="fill-muted-foreground/35" />
    {:else if kind === 'activity'}
      {#each [0, 1, 2] as row (row)}
        <circle cx="7" cy={6 + row * 6} r="2" class={row === 0 ? 'fill-primary' : 'fill-primary/40'} />
        <rect x="12" y={4.2 + row * 6} width={row === 1 ? 20 : 25} height="1.8" rx="0.9" class="fill-foreground/45" />
        <rect x="12" y={7.2 + row * 6} width="10" height="1.2" rx="0.6" class="fill-muted-foreground/35" />
        <rect x="35" y={5 + row * 6} width="5" height="2" rx="1" class="fill-muted-foreground/30" />
      {/each}
    {:else if kind === 'integrations'}
      {#each [0, 1, 2] as row (row)}
        <rect x="4" y={4 + row * 6} width="4" height="4" rx="1" class="fill-primary/20 stroke-primary" stroke-width="0.8" />
        <rect x="11" y={5 + row * 6} width="17" height="2" rx="1" class="fill-foreground/45" />
        <rect x="31" y={5 + row * 6} width="4" height="2" rx="1" class="fill-muted-foreground/35" />
        <rect x="37" y={5 + row * 6} width="3" height="2" rx="1" class={row === 1 ? 'fill-status-failed' : 'fill-muted-foreground/25'} />
      {/each}
    {:else if kind === 'quick-actions'}
      <rect x="4" y="4" width="17" height="7" rx="2" class="fill-primary" />
      <rect x="23" y="4" width="17" height="7" rx="2" class="fill-none stroke-border" stroke-width="1" />
      <rect x="4" y="13" width="17" height="7" rx="2" class="fill-none stroke-border" stroke-width="1" />
      <rect x="23" y="13" width="17" height="7" rx="2" class="fill-none stroke-border" stroke-width="1" />
      <rect x="7" y="6.8" width="9" height="1.6" rx="0.8" class="fill-primary-foreground" />
      <rect x="26" y="6.8" width="9" height="1.6" rx="0.8" class="fill-foreground/45" />
      <rect x="7" y="15.8" width="9" height="1.6" rx="0.8" class="fill-foreground/45" />
      <rect x="26" y="15.8" width="9" height="1.6" rx="0.8" class="fill-foreground/45" />
    {:else if kind === 'agent'}
      <rect x="4" y="5" width="12" height="12" rx="3" class="fill-primary/15 stroke-primary" stroke-width="1" />
      <rect x="7.5" y="9" width="5" height="4.5" rx="1" class="fill-primary" />
      <circle cx="15" cy="16" r="2" class="fill-status-passed stroke-background" stroke-width="1" />
      <rect x="21" y="6" width="16" height="2" rx="1" class="fill-foreground/45" />
      <rect x="21" y="11" width="18" height="2.2" rx="1.1" class="fill-muted" />
      <rect x="21" y="11" width="11" height="2.2" rx="1.1" class="fill-status-passed" />
      <rect x="21" y="16" width="18" height="2.2" rx="1.1" class="fill-muted" />
      <rect x="21" y="16" width="6" height="2.2" rx="1.1" class="fill-status-passed" />
    {:else if kind === 'pipeline'}
      <circle cx="8" cy="8" r="4" class="fill-status-passed" />
      <polyline points="6.2,8 7.6,9.5 10,6.5" class="fill-none stroke-background" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="15" y="6" width="22" height="2.4" rx="1.2" class="fill-foreground/50" />
      {#each [4, 13, 22, 31] as x, index (x)}
        <rect {x} y="16" width="8" height="4" rx="1.5" class={index === 2 ? 'fill-status-failed' : index === 3 ? 'fill-muted' : 'fill-status-passed'} />
      {/each}
    {/if}
  </svg>
</span>
