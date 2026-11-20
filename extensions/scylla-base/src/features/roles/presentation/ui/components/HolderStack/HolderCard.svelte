<script lang="ts">
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { t } from '@scylla/ui/i18n';
  import { Identity } from '@shared/presentation/ui';
  import {
    moreHolders,
    rolesMessages,
  } from '@base/features/roles/presentation/messages/roles.messages.ts';
  import type {
    HolderCard,
    HolderCardRow,
  } from '@base/features/roles/presentation/presenters/holder-card.presenter.ts';

  let { card }: { card: HolderCard } = $props();

  const ROW = 'flex items-center justify-between gap-3 rounded-[4px] px-1.5 py-[5px]';
</script>

{#snippet line(row: HolderCardRow)}
  <Identity
    format="cell"
    profile={{ displayName: row.displayName, username: row.handle }}
    kind={row.kind}
  />
  <span class="flex max-w-[50%] shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
    <span class="flex min-w-0 items-center gap-1">
      <row.scopeIcon class="size-3.5 shrink-0" aria-hidden="true" />
      <span class="truncate">{row.scope}</span>
    </span>
    <ChevronRightIcon class="invisible size-3.5 shrink-0 group-hover:visible" aria-hidden="true" />
  </span>
{/snippet}

<p class="px-1.5 text-xs font-medium text-muted-foreground">{card.heading}</p>
<ul class="flex flex-col rounded-md bg-muted p-1">
  {#each card.rows as row (row.actorId)}
    <li>
      {#if row.href}
        <a href={row.href} class="group {ROW} hover:bg-card">{@render line(row)}</a>
      {:else}
        <div class={ROW}>{@render line(row)}</div>
      {/if}
    </li>
  {/each}
</ul>
{#if card.more > 0 || card.allHref}
  <div class="flex items-center justify-between gap-3 px-1.5 pb-0.5 text-xs">
    {#if card.more > 0}
      <span class="text-muted-foreground">{t(moreHolders(card.more))}</span>
    {/if}
    {#if card.allHref}
      <a
        href={card.allHref}
        class="flex items-center gap-1 font-medium text-primary hover:underline"
      >
        {t(rolesMessages.seeAllMembers)}
        <ArrowRightIcon class="size-3" aria-hidden="true" />
      </a>
    {/if}
  </div>
{/if}
