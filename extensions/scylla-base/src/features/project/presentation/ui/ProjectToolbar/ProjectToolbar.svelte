<script lang="ts">
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
  import { SegmentedControl, type SegmentedOption } from '@scylla/ui';
  import {
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
  }

  let { text, health, order, counts, phone, onType, onClear, onHealth, onOrder }: Props = $props();

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
  ]);

  const sortedBy = $derived(t(ORDER_LABELS[order].trigger));
  const pickOrder = (value: string) => onOrder(orderOfParam(value));
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
  <div class="flex items-center gap-3" data-part="project-toolbar">
    {@render search()}
    {@render healthFilter()}
    <div class="flex-1"></div>
    <Select type="single" value={order} onValueChange={pickOrder}>
      <SelectTrigger class="w-[220px] shrink-0 bg-background" aria-label={t(projectMessages.sortLabel)}>
        <span class="truncate">{sortedBy}</span>
      </SelectTrigger>
      <SelectContent align="end" class="w-[220px]">
        {#each PAGE_ORDERS as item (item)}
          <SelectItem value={item} label={t(ORDER_LABELS[item].item)}>
            {t(ORDER_LABELS[item].item)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
{/if}
