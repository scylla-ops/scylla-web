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
    /** The width of the box, in px: the widget scales down to it. */
    width: number;
  }

  let { item, widgets, period, width }: Props = $props();

  const PX = { xs: [268, 98], s: [268, 212], m: [552, 212], l: [552, 440] } as const;

  const box = $derived(PX[shownSize(item.data, item.size)]);
  const scale = $derived(Math.min(1, (width - 48) / box[0]));
</script>

<div
  data-slot="widget-preview"
  class="flex items-center justify-center overflow-hidden rounded-xl bg-muted/60 p-6"
  style="height: {Math.round(box[1] * scale) + 48}px"
>
  <div
    inert
    class="flex shrink-0 origin-center [&>[data-slot=widget]]:size-full [&>[data-slot=widget]]:bg-background"
    style="width: {box[0]}px; height: {box[1]}px; transform: scale({scale})"
  >
    <DashboardWidget {item} {widgets} {period} />
  </div>
</div>
