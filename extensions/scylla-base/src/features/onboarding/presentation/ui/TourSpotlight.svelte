<script lang="ts">
  import { dimPath, ringPath, type TourRect, type TourSize } from '../tour-placement.calculator.ts';
  import { holdPointer } from '../tour-tracking.actions.ts';

  interface Props {
    viewport: TourSize;
    holes: readonly TourRect[];
    connectors: readonly string[];
  }

  let { viewport, holes, connectors }: Props = $props();
</script>

<svg class="pointer-events-none fixed inset-0 z-40 size-full" aria-hidden="true">
  <path
    use:holdPointer
    d={dimPath(viewport, holes)}
    fill-rule="evenodd"
    class="pointer-events-auto fill-black/55"
  />
</svg>

<svg class="pointer-events-none fixed inset-0 z-[60] size-full" aria-hidden="true">
  {#each holes as hole, index (index)}
    <path d={ringPath(hole)} class="fill-none stroke-primary" stroke-width="3" />
  {/each}
  {#each connectors as connector, index (index)}
    <path
      d={connector}
      class="fill-none stroke-white"
      stroke-width="1.5"
      stroke-dasharray="5 5"
      stroke-linecap="round"
    />
  {/each}
</svg>
