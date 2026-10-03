<script lang="ts">
  import { mount, unmount } from 'svelte';
  import type { RegisteredComponent } from './widget-injection-registry.ts';
  import { loadInjectedComponent } from './load-injected-component.ts';
  import { reportWidgetInjectionError } from './report-widget-injection-error.ts';

  interface Props {
    part: RegisteredComponent;
    /** The zone's shared, reactive context: one object for every component of the zone. */
    props: { context: unknown };
  }

  let { part, props }: Props = $props();
  let target: HTMLDivElement;

  // Mounted imperatively, not as `<Injected context={...} />`: a synchronous throw during the
  // component's own construction (a bug in the injected component) must be caught by a plain
  // try/catch around `mount()`. `<svelte:boundary>` around `{#await ... then}` does not reliably
  // catch it here — the component is instantiated while the awaited promise resolves, outside
  // the boundary's own synchronous render pass. Verified empirically, not merely assumed.
  $effect(() => {
    let instance: object | undefined;
    let cancelled = false;

    void loadInjectedComponent(part).then(Injected => {
      if (cancelled || !Injected) return;
      try {
        instance = mount(Injected, {
          target,
          props: {
            get context() {
              return props.context;
            },
          },
        });
      } catch (error) {
        reportWidgetInjectionError(part.key, error);
      }
    });

    return () => {
      cancelled = true;
      if (instance) void unmount(instance);
    };
  });
</script>

<div bind:this={target} style="display: contents"></div>

<style>
  /* `:global`: this rule must reach the zone element, an ancestor outside this component's own
     markup. It ships with this component's own CSS chunk, wherever Vite bundles it — no
     separate stylesheet, nothing for the app to remember to import (see widgets_plan.md §8.2). */
  :global([data-widget-replaced] > :not([data-widget-host])) {
    display: none;
  }
</style>
