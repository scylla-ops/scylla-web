<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import type { RoleEntity } from '@base/features/roles/domain/entities/role.entity.ts';
  import type { CatalogArea } from '@base/features/roles/domain/structs/catalog.struct.ts';
  import {
    morePermissions,
    rolesMessages,
  } from '@base/features/roles/presentation/messages/roles.messages.ts';
  import {
    permissionSummary,
    type PermissionChip,
  } from '@base/features/roles/presentation/presenters/role-permissions.presenter.ts';
  import { fitChips } from './fit-chips.attachments.ts';

  let { role, areas }: { role: RoleEntity; areas: readonly CatalogArea[] } = $props();

  const GAP = 6;
  const PILL =
    'inline-flex shrink-0 items-center rounded-md px-[7px] py-[3px] text-xs font-medium whitespace-nowrap';

  const summary = $derived(permissionSummary(role, areas));
  let fitting = $state<number>();
  let open = $state(false);
</script>

{#snippet chip(item: PermissionChip)}
  <span
    class="inline-flex shrink-0 items-center gap-[5px] rounded-md border px-2 py-[3px] text-xs whitespace-nowrap"
  >
    <span class="font-medium text-foreground">{item.title}</span>
    <span class="text-muted-foreground">{item.actions.join(' · ')}</span>
  </span>
{/snippet}

{#snippet moreCard(hidden: PermissionChip[])}
  <p class="px-1.5 text-xs font-medium text-muted-foreground">
    {t(morePermissions(hidden.length))}
  </p>
  <ul class="flex flex-col rounded-md bg-muted py-1">
    {#each hidden as item (item.area)}
      <li class="flex items-center justify-between gap-3 py-[5px] pr-1.5 pl-2.5">
        <span class="text-xs font-medium whitespace-nowrap text-foreground">{item.title}</span>
        <span class="flex gap-1">
          {#each item.actions as action (action)}
            <span class="rounded-[4px] border bg-card px-1.5 py-px text-xs text-muted-foreground">
              {action}
            </span>
          {/each}
        </span>
      </li>
    {/each}
  </ul>
  <p class="px-1.5 pb-0.5 text-xs text-muted-foreground">
    {role.builtin ? t(rolesMessages.openToSee) : t(rolesMessages.openToChange)}
  </p>
{/snippet}

<div class="w-[340px]">
  {#if summary.kind === 'full'}
    <span
      class="inline-flex items-center gap-[5px] rounded-md bg-primary/12 px-2 py-[3px] text-xs whitespace-nowrap"
    >
      <span class="font-medium text-primary">{t(rolesMessages.fullControl)}</span>
      <span class="text-muted-foreground">{summary.hint}</span>
    </span>
  {:else if summary.kind === 'viewOnly'}
    <span
      class="inline-flex max-w-full items-center gap-[5px] rounded-md border px-2 py-[3px] text-xs whitespace-nowrap"
    >
      <span class="shrink-0 font-medium text-foreground">{t(rolesMessages.viewOnly)}</span>
      <span class="truncate text-muted-foreground" title={summary.areas}>{summary.areas}</span>
    </span>
  {:else if summary.kind === 'chips'}
    {@const shown = summary.chips.slice(0, fitting ?? summary.chips.length)}
    {@const hidden = summary.chips.slice(shown.length)}
    <div class="relative overflow-hidden" {@attach fitChips(GAP, count => (fitting = count))}>
      <div
        data-measure
        aria-hidden="true"
        class="invisible absolute top-0 left-0 flex w-max gap-1.5"
      >
        {#each summary.chips as item (item.area)}
          {@render chip(item)}
        {/each}
        <span class={PILL}>+{summary.chips.length}</span>
      </div>
      <div class="flex items-center gap-1.5 overflow-hidden">
        {#each shown as item (item.area)}
          {@render chip(item)}
        {/each}
        {#if hidden.length > 0}
          <Tooltip onOpenChange={next => (open = next)}>
            <TooltipTrigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class={cn(
                    PILL,
                    open ? 'bg-foreground text-card' : 'bg-muted text-muted-foreground',
                  )}
                >
                  +{hidden.length}
                </button>
              {/snippet}
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              arrow={false}
              class="flex w-[232px] flex-col gap-1.5 rounded-[10px] border bg-card px-1.5 pt-2.5 pb-1.5 text-card-foreground shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.08)]"
            >
              {@render moreCard(hidden)}
            </TooltipContent>
          </Tooltip>
        {/if}
      </div>
    </div>
  {:else}
    <span class="text-muted-foreground">—</span>
  {/if}
</div>
