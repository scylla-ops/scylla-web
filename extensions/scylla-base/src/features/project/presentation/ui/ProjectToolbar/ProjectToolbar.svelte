<script lang="ts">
  import { tick } from 'svelte';
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
  import CheckIcon from '@lucide/svelte/icons/check';
  import MoveIcon from '@lucide/svelte/icons/move';
  import { GatedButton, SegmentedControl, type SegmentedOption } from '@scylla/ui';
  import {
    Button,
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type {
    ProjectCounts,
    ProjectHealth,
  } from '@base/features/project/domain/structs/project-search.struct.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';
  import {
    ORDER_LABELS,
    orderOfParam,
    PAGE_ORDERS,
    type PageOrder,
  } from '@base/features/project/presentation/presenters/project-list.presenter.ts';
  import type { ProjectDensity } from '@base/features/project/presentation/presenters/project-density.presenter.ts';
  import DensityMenu from '../ProjectDensity/DensityMenu.svelte';
  import ProjectSearchField from './ProjectSearchField.svelte';

  interface Props {
    text: string;
    health: ProjectHealth;
    order: PageOrder;
    /** The counts of the search, on the segments. A phone shows no count. */
    counts?: ProjectCounts;
    phone: boolean;
    onType: (value: string) => void;
    onClear: () => void;
    onHealth: (health: ProjectHealth) => void;
    onOrder: (order: PageOrder) => void;
    /** « Reorder » shows: the person moves the projects, on a screen that is not a phone. */
    canReorder: boolean;
    onReorder: () => void;
    /**
     * The reorder mode: « Done » takes the place of « Reorder », « Cancel » the place of
     * « Display », and the hint the place of the search and of the filter. Nothing moves.
     */
    reordering?: boolean;
    /** « Done » saves the moves. */
    busy?: boolean;
    onCancel?: () => void;
    onDone?: () => void;
    /** The density of the page, in the menu « Display ». */
    density: ProjectDensity;
    /** Some sections have their own density. */
    mixedDensity: boolean;
    onDensity: (density: ProjectDensity) => void;
    onApplyDensity: () => void;
  }

  let {
    text,
    health,
    order,
    counts,
    phone,
    onType,
    onClear,
    onHealth,
    onOrder,
    canReorder,
    onReorder,
    reordering = false,
    busy = false,
    onCancel,
    onDone,
    density,
    mixedDensity,
    onDensity,
    onApplyDensity,
  }: Props = $props();

  // The reorder mode moves the cards of the custom order, with no search.
  const reorderBlocked = $derived(
    order !== 'position'
      ? t(projectMessages.reorderNeedsCustom)
      : text.trim()
        ? t(projectMessages.reorderNeedsNoSearch)
        : undefined,
  );

  const healthOptions: SegmentedOption<ProjectHealth>[] = $derived([
    { value: 'all', label: t(projectMessages.healthAll), count: phone ? undefined : counts?.total },
    {
      value: 'failed',
      label: t(projectMessages.healthFailed),
      count: phone ? undefined : counts?.failed,
      dot: { color: 'text-destructive' },
    },
    {
      value: 'running',
      label: t(projectMessages.healthRunning),
      count: phone ? undefined : counts?.running,
      dot: { color: 'text-warning' },
    },
    {
      value: 'pending',
      label: t(projectMessages.healthPending),
      count: phone ? undefined : counts?.pending,
      dot: { color: 'text-status-queued' },
    },
  ]);

  const sortedBy = $derived(t(ORDER_LABELS[order].trigger));
  const pickOrder = (value: string) => onOrder(orderOfParam(value));

  /**
   * A layer of a place that two controls share: both stay in the page, so that the place keeps the
   * size of the larger one, and they cross-fade. The layer that is off is `inert`: no pointer and
   * no focus. No `visibility`: a button inherits it with its own transition, and takes no focus
   * while it moves.
   */
  const layer = (on: boolean) =>
    cn(
      'transition-opacity motion-reduce:transition-none',
      on ? 'duration-200 ease-out' : 'pointer-events-none opacity-0 duration-150 ease-in',
    );

  // The control under the focus turns off: the focus goes to the control that takes its place.
  // Before the update: a browser drops the focus of a control that becomes inert.
  let bar = $state<HTMLElement | null>(null);
  $effect.pre(() => {
    const off = reordering ? 'normal' : 'reorder';
    const next = reordering ? 'project-reorder-done' : 'project-reorder';
    if (!bar || !document.activeElement?.closest(`[data-layer="${off}"]`)) return;
    void tick().then(() => bar?.querySelector<HTMLElement>(`[data-part="${next}"]`)?.focus());
  });
</script>

{#snippet search()}
  <ProjectSearchField
    value={text}
    placeholder={t(phone ? projectMessages.searchPlaceholderShort : projectMessages.searchPlaceholder)}
    label={t(projectMessages.searchLabel)}
    showKey={!phone}
    onInput={onType}
    {onClear}
    class={phone ? 'w-full' : 'w-[340px] min-w-0 shrink'}
  />
{/snippet}

{#snippet display()}
  <DensityMenu
    value={density}
    mixed={mixedDensity}
    {phone}
    onChange={onDensity}
    onApplyToAll={onApplyDensity}
  />
{/snippet}

{#snippet healthFilter()}
  <SegmentedControl
    value={health}
    options={healthOptions}
    onChange={onHealth}
    size={phone ? 'sm' : 'default'}
    aria-label={t(projectMessages.healthLabel)}
    class={cn('shrink-0', phone && 'h-11')}
  />
{/snippet}

{#if phone}
  <div class="flex flex-col gap-4" data-part="project-toolbar">
    {@render search()}
    <div class="flex items-center gap-3">
      {@render healthFilter()}
      <div class="flex-1"></div>
      {@render display()}
      <DropdownMenu>
        <DropdownMenuTrigger
          class={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'size-11 rounded-lg')}
          aria-label={sortedBy}
        >
          <ArrowUpDownIcon class="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuRadioGroup value={order} onValueChange={pickOrder}>
            {#each PAGE_ORDERS as item (item)}
              <DropdownMenuRadioItem value={item} class="min-h-11">
                {t(ORDER_LABELS[item].item)}
              </DropdownMenuRadioItem>
            {/each}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
{:else}
  <div class="flex items-center gap-3" data-part="project-toolbar" bind:this={bar}>
    <!-- The hint of the reorder mode takes the place of the search and of the filter, which do not
         work in the mode. It takes their width, in two lines at most: the row keeps its height. -->
    <div class="grid min-w-0 shrink grid-cols-1 *:col-start-1 *:row-start-1">
      <div
        class={cn('flex min-w-0 items-center gap-3', layer(!reordering))}
        data-layer="normal"
        inert={reordering}
        aria-hidden={reordering || undefined}
      >
        {@render search()}
        {@render healthFilter()}
      </div>
      <div
        class={cn('flex w-0 min-w-full items-center gap-2', layer(reordering))}
        data-layer="reorder"
        inert={!reordering}
        aria-hidden={!reordering || undefined}
        data-part="project-reorder-hint"
      >
        <MoveIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
        <p class="line-clamp-2 text-sm leading-4.5 font-medium text-muted-foreground">
          {t(projectMessages.reorderHint)}
        </p>
      </div>
    </div>
    <div class="flex-1"></div>
    <!-- The order stays in its place in the reorder mode, turned off: the mode needs the custom order. -->
    <Select type="single" value={order} onValueChange={pickOrder} disabled={reordering}>
      <SelectTrigger class="w-[220px] shrink-0 bg-background" aria-label={t(projectMessages.sortLabel)}>
        <span class="truncate">{sortedBy}</span>
      </SelectTrigger>
      <SelectContent align="end" class="w-[220px]">
        {#each PAGE_ORDERS as item (item)}
          <SelectItem value={item} label={t(ORDER_LABELS[item].item)}>
            {t(ORDER_LABELS[item].item)}
          </SelectItem>
        {/each}
        {#if canReorder}
          <div class="-mx-1 my-1 h-px bg-border" role="separator"></div>
          <p class="px-2 py-1 text-xs text-muted-foreground">
            {t(projectMessages.reorderNeedsCustom)}
          </p>
        {/if}
      </SelectContent>
    </Select>
    {#if canReorder}
      <!-- « Cancel » in the place of « Display », « Done » in the place of « Reorder »: the button
           under the pointer stays a button, and Escape also cancels. -->
      <div class="grid shrink-0 justify-items-end *:col-start-1 *:row-start-1">
        <div
          class={layer(!reordering)}
          data-layer="normal"
          inert={reordering}
          aria-hidden={reordering || undefined}
        >
          {@render display()}
        </div>
        <div
          class={layer(reordering)}
          data-layer="reorder"
          inert={!reordering}
          aria-hidden={!reordering || undefined}
        >
          <Button variant="ghost" disabled={busy} onclick={onCancel}>
            {t(projectMessages.cancel)}
          </Button>
        </div>
      </div>
      <div class="grid shrink-0 *:col-start-1 *:row-start-1">
        <div
          class={cn('grid', layer(!reordering))}
          data-layer="normal"
          inert={reordering}
          aria-hidden={reordering || undefined}
        >
          <GatedButton
            variant="outline"
            allowed={!reorderBlocked}
            deniedReason={reorderBlocked}
            onclick={onReorder}
            class="shrink-0"
            data-part="project-reorder"
          >
            <MoveIcon aria-hidden="true" />
            {t(projectMessages.reorder)}
          </GatedButton>
        </div>
        <div
          class={cn('grid', layer(reordering))}
          data-layer="reorder"
          inert={!reordering}
          aria-hidden={!reordering || undefined}
        >
          <Button
            disabled={busy}
            aria-busy={busy || undefined}
            onclick={onDone}
            data-part="project-reorder-done"
          >
            <CheckIcon aria-hidden="true" />
            {t(projectMessages.done)}
          </Button>
        </div>
      </div>
    {:else}
      {@render display()}
    {/if}
  </div>
{/if}
