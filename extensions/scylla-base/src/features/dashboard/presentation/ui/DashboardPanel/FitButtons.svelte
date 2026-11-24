<script lang="ts">
  import { untrack } from 'svelte';
  import { Button } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import {
    fitLevels,
    type FitAction,
    type FitWidths,
  } from '@base/features/dashboard/presentation/presenters/fit-labels.presenter.ts';
  import GatedTooltip from './GatedTooltip.svelte';

  interface Props {
    actions: readonly FitAction[];
    /** The keys of the actions, the first to shorten first. */
    collapseOrder: readonly string[];
    /** One action that fills the row in each level, so that it never moves. */
    stretch?: boolean;
    size?: 'sm' | 'default';
    class?: string;
  }

  let { actions, collapseOrder, stretch = false, size = 'sm', class: className }: Props = $props();

  const GAP_PX = 8;

  let available = $state(0);
  const widths = $state<FitWidths[]>(untrack(() => actions.map(() => ({ full: 0, short: 0, icon: 0 }))));

  const levels = $derived(
    fitLevels(
      available,
      GAP_PX,
      widths,
      collapseOrder.map(key => actions.findIndex(action => action.key === key)).filter(index => index >= 0),
    ),
  );
  const iconSize = $derived(size === 'sm' ? 'icon-sm' : 'icon');
</script>

<div
  data-slot="fit-buttons"
  class={cn('relative flex min-w-0 items-center justify-between gap-2', className)}
  bind:clientWidth={available}
>
  <div aria-hidden="true" inert class="pointer-events-none invisible absolute top-0 left-0 flex h-0 w-max overflow-hidden">
    {#each actions as action, index (action.key)}
      <span class="inline-flex shrink-0" bind:offsetWidth={widths[index].full}>
        <Button variant={action.variant ?? 'default'} {size} tabindex={-1}>
          {#if action.labeledIcon}<action.icon />{/if}{action.label}
        </Button>
      </span>
      <span class="inline-flex shrink-0" bind:offsetWidth={widths[index].short}>
        <Button variant={action.variant ?? 'default'} {size} tabindex={-1}>
          {#if action.labeledIcon}<action.icon />{/if}{action.short}
        </Button>
      </span>
      <span class="inline-flex shrink-0" bind:offsetWidth={widths[index].icon}>
        <Button variant={action.variant ?? 'default'} size={iconSize} tabindex={-1}><action.icon /></Button>
      </span>
    {/each}
  </div>

  {#each actions as action, index (action.key)}
    {@const level = levels[index] ?? 'full'}
    <GatedTooltip label={action.label} enabled={level !== 'full'} resetKey={level}>
      {#snippet trigger({ props })}
        <Button
          {...props}
          variant={action.variant ?? 'default'}
          size={level === 'icon' && !stretch ? iconSize : size}
          class={cn('min-w-0', stretch ? 'w-full' : 'shrink-0')}
          aria-label={level === 'full' ? undefined : action.label}
          data-level={level}
          disabled={action.disabled}
          onclick={action.onclick}
        >
          {#if level === 'icon' || action.labeledIcon}<action.icon aria-hidden="true" />{/if}
          {#if level !== 'icon'}<span class="truncate">{level === 'full' ? action.label : action.short}</span>{/if}
        </Button>
      {/snippet}
    </GatedTooltip>
  {/each}
</div>
