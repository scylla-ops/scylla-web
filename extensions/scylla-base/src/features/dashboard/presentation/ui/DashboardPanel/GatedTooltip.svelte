<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';

  interface Props {
    label: string;
    /** `false` while the full label shows: no tooltip then. */
    enabled: boolean;
    /** A change, e.g. of the level of the label, waits for a new move of the pointer. */
    resetKey: unknown;
    side?: 'top' | 'right';
    trigger: Snippet<[{ props: Record<string, unknown> }]>;
  }

  let { label, enabled, resetKey, side = 'top', trigger }: Props = $props();

  const RESIZE_HANDLE = '[data-slot="second-sidebar-handle"]';

  let open = $state(false);
  let armed = $state(false);
  let resizing = $state(false);

  $effect(() => {
    void resetKey;
    untrack(() => {
      armed = false;
      open = false;
    });
  });

  const withMove = (props: Record<string, unknown>) => ({
    ...props,
    onpointermove: (event: PointerEvent) => {
      (props.onpointermove as ((event: PointerEvent) => void) | undefined)?.(event);
      if (!resizing) armed = true;
    },
  });
</script>

<svelte:window
  onpointerdowncapture={event => {
    if (event.target instanceof Element && event.target.closest(RESIZE_HANDLE)) {
      resizing = true;
      open = false;
      armed = false;
    }
  }}
  onpointerupcapture={() => (resizing = false)}
  onpointercancelcapture={() => (resizing = false)}
/>

{#if enabled}
  <Tooltip
    delayDuration={300}
    {open}
    onOpenChange={next => {
      open = next && armed && !resizing;
    }}
  >
    <TooltipTrigger>
      {#snippet child({ props })}
        {@render trigger({ props: withMove(props) })}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent {side}>{label}</TooltipContent>
  </Tooltip>
{:else}
  {@render trigger({ props: {} })}
{/if}
