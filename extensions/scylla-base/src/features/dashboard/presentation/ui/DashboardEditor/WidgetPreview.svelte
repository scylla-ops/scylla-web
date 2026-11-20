<script lang="ts">
  import type { LayoutWidget } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import { shownSize } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import DashboardWidget from './DashboardWidget.svelte';

  interface Props {
    item: Pick<LayoutWidget, 'data' | 'size'>;
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    /** The width of the box, in px, until the box is measured: the widget scales down to it. */
    width: number;
    /** The box fills its parent and centres the widget in it, at its real size when it fits. */
    fill?: boolean;
  }

  let { item, widgets, period, width, fill = false }: Props = $props();

  const PX = { xs: [268, 98], s: [268, 212], m: [552, 212], l: [552, 440] } as const;

  let measured = $state(0);
  let measuredHeight = $state(0);
  const PAD_PX = 48;

  const box = $derived(PX[shownSize(item.data, item.size)]);
  const scale = $derived(
    Math.min(
      1,
      ((measured || width) - PAD_PX) / box[0],
      fill && measuredHeight ? (measuredHeight - PAD_PX) / box[1] : 1,
    ),
  );
</script>

<div
  data-slot="widget-preview"
  bind:clientWidth={measured}
  bind:clientHeight={measuredHeight}
  class="flex items-center justify-center overflow-hidden rounded-xl bg-muted/60 {fill ? 'absolute inset-0' : 'p-6'}"
  style={fill ? undefined : `height: ${Math.round(box[1] * scale) + PAD_PX}px`}
>
  <div
    inert
    data-scale={scale.toFixed(2)}
    class="flex shrink-0 origin-center [&>[data-slot=widget]]:size-full [&>[data-slot=widget]]:bg-background"
    style="width: {box[0]}px; height: {box[1]}px; transform: scale({scale})"
  >
    <DashboardWidget {item} {widgets} {period} />
  </div>
</div>
