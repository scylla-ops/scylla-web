<script lang="ts" generics="C">
  import type { Snippet } from 'svelte';
  import { componentsOf, nameOf, type RegisteredComponent } from '../widget-injection-registry.ts';
  import type { ZonePoint } from '../widget-points.struct.ts';
  import { resolveZone } from '../widget-zone.calculator.ts';
  import { loadInjectedComponent } from '../load-injected-component.ts';
  import { reportWidgetInjectionError } from '../report-widget-injection-error.ts';

  interface Props {
    point: ZonePoint<C>;
    /** What the injected components receive. They follow its changes with no remount. */
    context: C;
    /** The owner's own content: a `replace` component takes its place. */
    children?: Snippet;
  }

  let { point, context, children }: Props = $props();

  const parts = $derived(componentsOf(point) as readonly RegisteredComponent<C>[]);
  // `when` and the access policy's `can` are reactive: a permission that loads after the first
  // render, or a `when` that flips, renders the zone again.
  const resolved = $derived(resolveZone(parts, context));
</script>

<!-- Rendered in the owner's tree: an injected component reads the owner's Svelte context. -->
{#snippet injected(parts: readonly RegisteredComponent<C>[])}
  {#each parts as part (part.key)}
    {#await loadInjectedComponent(part) then Injected}
      {#if Injected}
        <!-- One injection must not break the page it changes. -->
        <svelte:boundary onerror={error => reportWidgetInjectionError(part.key, error)}>
          <Injected {context} />
        </svelte:boundary>
      {/if}
    {/await}
  {/each}
{/snippet}

<div data-widget-zone={nameOf(point) ?? ''} style="display: contents">
  {@render injected(resolved.before)}
  {#if resolved.replace}
    {@render injected([resolved.replace])}
  {:else}
    {@render children?.()}
  {/if}
  {@render injected(resolved.after)}
</div>
