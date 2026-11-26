<script lang="ts">
  import type { LucideIcon } from '@scylla/ui';
  import {
    buttonVariants,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    icon: LucideIcon;
    /** The accessible name and the tooltip. */
    label: string;
    /** A link, e.g. a new project in this group. Unset: a button. */
    href?: string;
    onclick?: () => void;
    part: string;
  }

  let { icon: Icon, label, href, onclick, part }: Props = $props();

  // At rest, a mouse sees no action: it shows on hover of the header, on focus, and on a touch
  // screen always.
  const CLASS = cn(
    buttonVariants({ variant: 'ghost', size: 'icon' }),
    'size-8 shrink-0 rounded-full transition-[opacity,color,background-color] max-md:size-11 motion-reduce:transition-none pointer-fine:opacity-0 pointer-fine:group-focus-within/header:opacity-100 pointer-fine:group-hover/header:opacity-100',
  );
</script>

<!-- A small action of a section header: a "+" for a new project, a folder for a new group. -->
<Tooltip>
  {#if href}
    <TooltipTrigger>
      {#snippet child({ props })}
        <a {...props} {href} class={CLASS} data-part={part}>
          <Icon class="size-4" aria-hidden="true" />
          <span class="sr-only">{label}</span>
        </a>
      {/snippet}
    </TooltipTrigger>
  {:else}
    <TooltipTrigger class={CLASS} data-part={part} {onclick}>
      <Icon class="size-4" aria-hidden="true" />
      <span class="sr-only">{label}</span>
    </TooltipTrigger>
  {/if}
  <TooltipContent>
    <p>{label}</p>
  </TooltipContent>
</Tooltip>
