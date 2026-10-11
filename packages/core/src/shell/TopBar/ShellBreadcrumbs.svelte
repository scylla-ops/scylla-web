<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { routeParams, routeTrail, type ShellContributions } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { breadcrumbsFor, type BreadcrumbItem } from './breadcrumbs.ts';
  import { mergeParams } from './shell-config.ts';

  let { contributions }: { contributions: readonly ShellContributions[] } = $props();

  const crumbs = $derived(
    breadcrumbsFor(
      routeTrail(),
      mergeParams([routeParams, ...contributions.map(shell => shell.breadcrumbParams)]),
      t,
    ),
  );
</script>

{#snippet content(crumb: BreadcrumbItem)}
  <span class="whitespace-nowrap">{crumb.label}</span>{#if crumb.highlight}<span
      class="text-primary">#{crumb.highlight}</span
    >{/if}{#if crumb.detail}<span class="whitespace-nowrap">- {crumb.detail}</span>{/if}
{/snippet}

{#if crumbs.length > 0}
  <nav aria-label="breadcrumb" data-slot="breadcrumb">
    <ol
      data-slot="breadcrumb-list"
      class="flex flex-wrap items-center gap-2 text-sm break-words text-muted-foreground sm:gap-2.5"
    >
      {#each crumbs as crumb, index (index)}
        <li data-slot="breadcrumb-item" class="inline-flex items-center gap-1.5">
          {#if index === crumbs.length - 1}
            <span
              data-slot="breadcrumb-page"
              role="link"
              aria-disabled="true"
              aria-current="page"
              class="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm font-semibold text-foreground"
            >
              {@render content(crumb)}
            </span>
          {:else}
            <a
              data-slot="breadcrumb-link"
              href={crumb.pathname}
              class="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
            >
              {@render content(crumb)}
            </a>
          {/if}
        </li>
        {#if index < crumbs.length - 1}
          <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true">
            <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
          </li>
        {/if}
      {/each}
    </ol>
  </nav>
{/if}
