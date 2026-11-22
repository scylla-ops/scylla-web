<script lang="ts">
  import { untrack } from 'svelte';
  import { SegmentedControl } from '@scylla/ui';
  import {
    Button,
    Dialog,
    DialogDescription,
    DialogTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SheetContent,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type {
    LayoutSize,
    LayoutWidget,
    WidgetData,
  } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import {
    cellsText,
    DATA,
    kindOf,
    shownSize,
    SIZE_ORDER,
    sizeLabel,
    sizeShort,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import TargetPicker from './TargetPicker.svelte';
  import WidgetPreview from './WidgetPreview.svelte';

  interface Props {
    open: boolean;
    item: LayoutWidget;
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    onApply: (change: { data: WidgetData; size: LayoutSize; target: string | undefined }) => void;
    onRemove: () => void;
    onClose: () => void;
  }

  let { open, item, widgets, period, onApply, onRemove, onClose }: Props = $props();

  let data = $state<WidgetData>(untrack(() => item.data));
  let size = $state<LayoutSize>(untrack(() => shownSize(item.data, item.size)));
  let target = $state<string | undefined>(untrack(() => item.target));

  const entry = $derived(kindOf(DATA[data].kind));
  const targetKind = $derived(DATA[data].target);
  const sizes = $derived(DATA[data].sizes);
  const options = $derived(
    SIZE_ORDER.filter(option => sizes.includes(option)).map(option => ({
      value: option,
      label: `${sizeShort(option)} · ${cellsText(option).replaceAll(' ', '')}`,
    })),
  );

  const pickData = (next: string) => {
    const value = next as WidgetData;
    data = value;
    if (!DATA[value].sizes.includes(size)) size = DATA[value].sizes[0];
  };
</script>

<Dialog {open} onOpenChange={next => !next && onClose()}>
  <SheetContent side="right" overlayClass="bg-black/25" class="w-full gap-0 p-0 sm:max-w-[384px]">
    <header class="flex flex-col gap-0.5 px-5 pt-5 pb-4 pr-12">
      <DialogTitle>{t(DATA[data].title)}</DialogTitle>
      <DialogDescription class="text-xs">
        {t(messages.kindAndSize(t(entry.title), sizeLabel(size), cellsText(size)))}
      </DialogDescription>
    </header>

    <div class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5">
      <WidgetPreview item={{ data, size, target }} {widgets} {period} width={344} />

      <Tabs value="data" class="gap-4">
        <TabsList>
          <TabsTrigger value="data">{t(messages.data)}</TabsTrigger>
          <TabsTrigger value="display">{t(messages.display)}</TabsTrigger>
        </TabsList>
        <TabsContent value="data" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <p class="text-xs text-muted-foreground">{t(messages.show)}</p>
            <Select type="single" value={data} onValueChange={pickData}>
              <SelectTrigger class="w-full" aria-label={t(messages.show)}>
                <SelectValue>{t(DATA[data].title)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {#each entry.data as option (option)}
                  <SelectItem value={option} label={t(DATA[option].title)}>{t(DATA[option].title)}</SelectItem>
                {/each}
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">{t(DATA[data].hint)}</p>
          </div>
          {#if targetKind}
            <TargetPicker kind={targetKind} value={target} {widgets} onChange={value => (target = value)} />
          {/if}
          <p class="text-xs text-muted-foreground">{t(messages.followsDashboard)}</p>
        </TabsContent>
        <TabsContent value="display" class="flex flex-col gap-1.5">
          <p class="text-xs text-muted-foreground">{t(messages.stepSize)}</p>
          <SegmentedControl
            size="sm"
            aria-label={t(messages.stepSize)}
            value={size}
            {options}
            onChange={value => (size = value)}
          />
        </TabsContent>
      </Tabs>
    </div>

    <footer class="flex items-center gap-2 border-t border-border px-5 py-3">
      <Button variant="ghost-destructive" size="sm" class="mr-auto" onclick={onRemove}>
        {t(messages.removeWidget)}
      </Button>
      <Button variant="ghost" size="sm" onclick={onClose}>{t(messages.cancel)}</Button>
      <Button size="sm" onclick={() => onApply({ data, size, target: targetKind ? target : undefined })}>{t(messages.apply)}</Button>
    </footer>
  </SheetContent>
</Dialog>
