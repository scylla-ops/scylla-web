<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { SegmentedControl } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type {
    LayoutSize,
    LayoutWidget,
  } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { dashboardMessages as messages } from '@base/features/dashboard/presentation/messages/dashboard.messages.ts';
  import {
    shownSize,
    sizeOptions,
  } from '@base/features/dashboard/presentation/presenters/widget-sizes.presenter.ts';

  interface Props {
    item: LayoutWidget;
    title: string;
    onResize: (size: LayoutSize) => void;
    onRemove: () => void;
  }

  let { item, title, onResize, onRemove }: Props = $props();

  const options = $derived(sizeOptions(item.widget));
</script>

{#if options.length > 1}
  <SegmentedControl
    size="sm"
    aria-label={t(messages.sizeOf(title))}
    value={shownSize(item.widget, item.size)}
    {options}
    onChange={onResize}
  />
{/if}
<Button
  variant="outline"
  size="icon-sm"
  aria-label={t(messages.removeWidget(title))}
  title={t(messages.removeWidget(title))}
  onclick={onRemove}
>
  <XIcon aria-hidden="true" />
</Button>
