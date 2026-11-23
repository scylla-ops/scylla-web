<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import { spin } from './logo-mark.attachments.svelte.ts';
  import type { LogoMarkState } from './logo-mark.ts';

  interface Props {
    state?: LogoMarkState;
    class?: string;
  }

  let { state = 'idle', class: className }: Props = $props();

  /** Clockwise from the top left: the order in which the dots light. */
  const DOTS = [
    { cx: 14, cy: 14 },
    { cx: 58, cy: 14 },
    { cx: 58, cy: 58 },
    { cx: 14, cy: 58 },
  ];
</script>

<!-- `logo_mark.svg`, drawn inline so that each dot can change. -->
<svg
  viewBox="0 0 72 72"
  aria-hidden="true"
  data-slot="logo-mark"
  data-state={state}
  class={cn('origin-center', className)}
  {@attach spin(() => state === 'waiting')}
>
  {#each DOTS as dot, index (index)}
    <circle cx={dot.cx} cy={dot.cy} r="14" style:--dot={index} />
  {/each}
</svg>

<style>
  circle {
    fill: #5d9972;
    opacity: 0.14;
    transition:
      fill 200ms ease-out,
      opacity 200ms ease-out;
  }

  svg[data-state='waiting'] circle {
    fill: var(--muted-foreground);
    opacity: 0.3;
    transition-duration: 120ms;
  }

  svg[data-state='lit'] circle {
    opacity: 1;
    transition-delay: calc(var(--dot) * 60ms);
  }

  svg[data-state='lit'] {
    animation: pop 480ms both;
  }

  @keyframes pop {
    0% {
      scale: 1;
      animation-timing-function: ease-out;
    }
    58% {
      scale: 1.04;
      animation-timing-function: ease-in-out;
    }
    100% {
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg[data-state='waiting'] circle {
      animation: pulse 1.8s ease-in-out infinite;
    }

    svg[data-state='lit'] circle {
      transition-delay: 0ms;
    }

    svg[data-state='lit'] {
      animation: none;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
  }
</style>
