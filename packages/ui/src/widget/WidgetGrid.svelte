<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils/index.ts';
  import { widgetGridStyle } from './widget-size.ts';

  interface Props {
    'aria-label'?: string;
    class?: string;
    children: Snippet;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<div class={cn('@container', className)}>
  <div
    data-slot="widget-grid"
    class="grid grid-flow-row-dense auto-rows-(--widget-grid-row) grid-cols-(--widget-grid-columns) gap-(--widget-grid-gap) @3xl:auto-rows-(--widget-grid-row-wide) @3xl:grid-cols-(--widget-grid-columns-wide) @3xl:gap-(--widget-grid-gap-wide)"
    style={widgetGridStyle()}
    {...rest}
  >
    {@render children()}
  </div>
</div>
