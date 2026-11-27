<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import type { LucideIcon } from '../../icon.ts';
  import { cn } from '../../utils/index.ts';
  import { GHOST_ITEM_SHAPES, type GhostItemShape } from './ghost-item.ts';

  interface Props {
    /** The text of the action, e.g. "New project". */
    label: string;
    shape?: GhostItemShape;
    icon?: LucideIcon;
    /** A link. Unset: a button. */
    href?: string;
    onclick?: () => void;
    class?: string;
    [key: `data-${string}`]: string | undefined;
  }

  let {
    label,
    shape = 'card',
    icon: Icon = PlusIcon,
    href,
    onclick,
    class: className,
    ...rest
  }: Props = $props();

  const CLASS = $derived(
    cn(
      'flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed px-3 text-center text-sm font-medium text-muted-foreground transition-colors outline-none hover:border-primary/50 hover:bg-primary/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
      GHOST_ITEM_SHAPES[shape],
      className,
    ),
  );
  const ICON = $derived(shape === 'row' ? 'size-4 shrink-0' : 'size-5 shrink-0');
</script>

<!-- The place of one more item after the last one: it adds an item, it is not an item. -->
{#if href}
  <a {href} class={CLASS} data-slot="ghost-item" data-shape={shape} {...rest}>
    <Icon class={ICON} aria-hidden="true" />
    <span class="max-w-full truncate">{label}</span>
  </a>
{:else}
  <button
    type="button"
    class={CLASS}
    data-slot="ghost-item"
    data-shape={shape}
    {onclick}
    {...rest}
  >
    <Icon class={ICON} aria-hidden="true" />
    <span class="max-w-full truncate">{label}</span>
  </button>
{/if}
