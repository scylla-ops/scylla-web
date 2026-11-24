<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { routeParams, routeTrail, type ShellContributions } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { breadcrumbsFor, type BreadcrumbItem } from './breadcrumbs.ts';
  import { mergeParams } from '../shell-config.ts';

  interface Props {
    contributions: readonly ShellContributions[];
    /** Before the crumbs of the route, unless the first one has the same name. */
    leading?: BreadcrumbItem;
  }

  let { contributions, leading }: Props = $props();

  const trail = $derived(
    breadcrumbsFor(
      routeTrail(),
      mergeParams([routeParams, ...contributions.map(shell => shell.breadcrumbParams)]),
      t,
    ),
  );
  const crumbs = $derived(
    leading && trail[0]?.label !== leading.label ? [leading, ...trail] : trail,
  );
</script>

<!--
  One line. The highlight of the current crumb shrinks first, down to one character: it takes the
  room that the label and the detail leave. Only a bar narrower than the current crumb shrinks its
  label too.
-->
{#snippet content(crumb: BreadcrumbItem, current: boolean)}
  <span class={cn('max-w-48 truncate', current ? 'min-w-0' : 'shrink-0')} title={crumb.label}
    >{crumb.label}</span
  >
  {#if crumb.highlight}
    <span
      class={cn(
        'text-primary',
        current ? 'line-clamp-1 min-w-5 grow basis-0 break-all' : 'max-w-40 truncate',
      )}
      title={crumb.highlight}>#{crumb.highlight}</span
    >
  {/if}
  {#if crumb.detail}
    <span class="shrink-0 whitespace-nowrap">- {crumb.detail}</span>
  {/if}
{/snippet}

{#if crumbs.length > 0}
  <!--
    Too narrow for the crumbs before the current one: they go out at the left edge, in a fade. The
    current crumb is at most as wide as the bar (`100cqw` of the `nav`), so it never goes out.
  -->
  <nav
    aria-label="breadcrumb"
    data-slot="breadcrumb"
    class="@container -my-1 -ml-3 flex justify-end overflow-x-clip py-1 pl-3 mask-l-from-[calc(100%-0.75rem)]"
  >
    <ol
      data-slot="breadcrumb-list"
      class="flex w-full min-w-min items-center gap-2 text-sm text-muted-foreground sm:gap-2.5"
    >
      {#each crumbs as crumb, index (index)}
        {@const current = index === crumbs.length - 1}
        <li
          data-slot="breadcrumb-item"
          class={cn('flex items-center', current ? 'max-w-[100cqw] min-w-0' : 'shrink-0')}
        >
          {#if current}
            <span
              data-slot="breadcrumb-page"
              role="link"
              aria-disabled="true"
              aria-current="page"
              class="flex min-w-0 items-center gap-1 text-sm text-foreground"
            >
              {@render content(crumb, true)}
            </span>
          {:else}
            <a
              data-slot="breadcrumb-link"
              href={crumb.pathname}
              class="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
            >
              {@render content(crumb, false)}
            </a>
          {/if}
        </li>
        {#if !current}
          <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            class="shrink-0"
          >
            <ChevronRightIcon class="h-4 w-4 text-muted-foreground" />
          </li>
        {/if}
      {/each}
    </ol>
  </nav>
{/if}
