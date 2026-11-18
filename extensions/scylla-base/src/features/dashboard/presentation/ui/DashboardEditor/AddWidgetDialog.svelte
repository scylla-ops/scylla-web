<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { untrack } from 'svelte';
  import { Button, Dialog, DialogContent, DialogTitle, Input } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    LayoutSize,
    WidgetData,
  } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
  import { editorMessages as messages } from '@base/features/dashboard/presentation/messages/editor.messages.ts';
  import {
    DATA,
    kindOf,
    searchKinds,
    SIZE_CELLS,
    SIZE_ORDER,
    sizeLabel,
    type WidgetKind,
  } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
  import type { DashboardPeriodState } from '@base/features/dashboard/presentation/ui/dashboard-period.state.svelte.ts';
  import type { DashboardWidgets } from '@base/features/dashboard/presentation/ui/widgets/dashboard-widgets.state.svelte.ts';
  import KindThumb from './KindThumb.svelte';
  import SizeGlyph from './SizeGlyph.svelte';
  import WidgetPreview from './WidgetPreview.svelte';

  interface Props {
    kind: WidgetKind;
    widgets: DashboardWidgets;
    period: DashboardPeriodState;
    onAdd: (data: WidgetData, size: LayoutSize) => void;
    onClose: () => void;
  }

  let { kind: firstKind, widgets, period, onAdd, onClose }: Props = $props();

  let kind = $state(untrack(() => firstKind));
  let query = $state('');
  const entry = $derived(kindOf(kind));
  let data = $state<WidgetData | null>(untrack(() => kindOf(firstKind).data[0] ?? null));
  let size = $state<LayoutSize>(untrack(() => (kindOf(firstKind).data[0] ? DATA[kindOf(firstKind).data[0]].sizes[0] : 'm')));

  const kinds = $derived(searchKinds(query));
  const sizes = $derived(data ? DATA[data].sizes : []);

  const pickKind = (next: WidgetKind) => {
    kind = next;
    const first = kindOf(next).data[0] ?? null;
    data = first;
    if (first) size = DATA[first].sizes[0];
  };

  const pickData = (next: WidgetData) => {
    data = next;
    if (!DATA[next].sizes.includes(size)) size = DATA[next].sizes[0];
  };

  const STEPS = [messages.stepKind, messages.stepSize, messages.stepData];
</script>

<Dialog open onOpenChange={open => !open && onClose()}>
  <DialogContent class="max-w-[944px] gap-0 overflow-hidden p-0 sm:max-w-[944px]">
    <header class="flex items-center gap-4 border-b border-border px-6 py-5 pr-14">
      <DialogTitle>{t(messages.addWidget)}</DialogTitle>
      <ol class="ml-auto flex items-center gap-2 text-xs">
        {#each STEPS as step, index (index)}
          <li class="flex items-center gap-2">
            {#if index > 0}<span class="h-px w-4 bg-border" aria-hidden="true"></span>{/if}
            <span
              class={cn(
                'flex size-5 items-center justify-center rounded-full text-[10px]',
                index === 0 ? 'bg-primary/15 text-primary' : index === 1 ? 'bg-foreground text-background' : 'bg-muted',
              )}
            >
              {#if index === 0}<CheckIcon class="size-3" aria-hidden="true" />{:else}{index + 1}{/if}
            </span>
            <span class={index === 1 ? 'font-medium' : 'text-muted-foreground'}>{t(step)}</span>
          </li>
        {/each}
      </ol>
    </header>

    <div class="grid min-h-0 grid-cols-[220px_1fr_220px]">
      <div class="flex max-h-[460px] flex-col gap-2 border-r border-border p-3">
        <label class="relative block">
          <SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input class="h-8 pl-8 text-xs" placeholder={t(messages.searchKinds)} aria-label={t(messages.searchKinds)} bind:value={query} />
        </label>
        <p class="px-1 pt-1 text-[11px] text-muted-foreground uppercase">{t(messages.kinds)}</p>
        <ul class="relative flex min-h-0 flex-col gap-1 overflow-y-auto">
          {#each kinds as item (item.kind)}
            <li>
              <button
                type="button"
                disabled={item.data.length === 0}
                aria-pressed={item.kind === kind}
                class={cn(
                  'flex w-full items-center gap-3 rounded-lg p-1.5 text-left',
                  item.kind === kind ? 'bg-primary/10' : 'hover:bg-accent',
                  item.data.length === 0 && 'opacity-50',
                )}
                onclick={() => pickKind(item.kind)}
              >
                <KindThumb kind={item.kind} />
                <span class="min-w-0">
                  <span class={cn('block truncate text-sm', item.kind === kind && 'text-primary')}>{t(item.title)}</span>
                  <span class="block truncate text-[11px] text-muted-foreground">
                    {item.data.length === 0 ? t(messages.soon) : t(item.text)}
                  </span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </div>

      <div class="flex min-w-0 flex-col gap-4 p-5">
        <p class="text-base">
          <span class="font-medium">{t(entry.title)}</span>
          <span class="text-sm text-muted-foreground"> · {t(messages.pickSize)}</span>
        </p>
        {#if data}
          <WidgetPreview item={{ data, size }} {widgets} {period} width={430} />
        {/if}
        <div role="radiogroup" aria-label={t(messages.stepSize)} class="grid grid-cols-4 gap-2">
          {#each SIZE_ORDER as option (option)}
            {@const allowed = sizes.includes(option)}
            <button
              type="button"
              role="radio"
              aria-checked={option === size}
              disabled={!allowed}
              title={allowed ? undefined : t(messages.notInThisSize)}
              class={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-3 text-center',
                option === size ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
                !allowed && 'opacity-40',
              )}
              onclick={() => (size = option)}
            >
              <SizeGlyph size={option} />
              <span class="text-sm">{sizeLabel(option)}</span>
              <span class="font-mono text-[11px] text-muted-foreground">
                {t(messages.cells(SIZE_CELLS[option].columns, SIZE_CELLS[option].rows))}
              </span>
            </button>
          {/each}
        </div>
        <p class="text-xs text-muted-foreground">{t(messages.sameDataEverySize)}</p>
      </div>

      <div class="flex flex-col gap-3 border-l border-border p-5">
        <p class="text-sm font-medium">{t(messages.whatShouldItShow)}</p>
        <div role="radiogroup" aria-label={t(messages.whatShouldItShow)} class="flex flex-col gap-1">
          {#each entry.data as option (option)}
            <button
              type="button"
              role="radio"
              aria-checked={option === data}
              class={cn(
                'flex items-start gap-2.5 rounded-lg p-2 text-left',
                option === data ? 'bg-primary/10' : 'hover:bg-accent',
              )}
              onclick={() => pickData(option)}
            >
              <span
                class={cn(
                  'mt-0.5 size-3.5 shrink-0 rounded-full border',
                  option === data ? 'border-4 border-primary' : 'border-border',
                )}
              ></span>
              <span>
                <span class="block text-sm">{t(DATA[option].title)}</span>
                <span class="block text-[11px] text-muted-foreground">{t(DATA[option].hint)}</span>
              </span>
            </button>
          {/each}
        </div>
        <p class="mt-2 text-xs text-muted-foreground">{t(messages.followsDashboard)}</p>
      </div>
    </div>

    <footer class="flex items-center gap-3 border-t border-border px-6 py-3">
      <p class="mr-auto text-xs text-muted-foreground">{t(messages.landsFirstFreeSpot)}</p>
      <Button variant="ghost" size="sm" onclick={onClose}>{t(messages.back)}</Button>
      <Button size="sm" disabled={!data} onclick={() => data && onAdd(data, size)}>
        <PlusIcon aria-hidden="true" />
        {t(messages.addWidgetAction)}
      </Button>
    </footer>
  </DialogContent>
</Dialog>
