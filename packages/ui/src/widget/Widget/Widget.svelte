<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '../../icon.ts';
  import { cn } from '../../utils/index.ts';
  import { widgetSpanStyle, type WidgetSize } from '../widget-size.ts';

  interface Props {
    size: WidgetSize;
    title: string;
    icon?: LucideIcon;
    /** A short text after the title: the period, the scope. */
    meta?: string;
    /** The right end of the header: a count, a state, or actions. */
    aside?: Snippet;
    /** The controls of the edit mode of a dashboard, over the card. */
    editing?: Snippet;
    class?: string;
    children: Snippet;
  }

  let { size, title, icon: Icon, meta, aside, editing, class: className, children }: Props = $props();

  const titleId = $props.id();
  const compact = $derived(size === 'xs');
</script>

<section
  data-slot="widget"
  data-size={size}
  aria-labelledby={titleId}
  style={widgetSpanStyle(size)}
  class={cn(
    'relative flex min-h-0 min-w-0 flex-col overflow-clip rounded-xl border p-3 text-foreground @3xl:p-4',
    'col-span-(--widget-columns) row-span-(--widget-rows) @3xl:col-span-(--widget-columns-wide) @3xl:row-span-(--widget-rows-wide)',
    compact ? 'justify-center gap-1' : 'gap-3',
    className,
  )}
>
  <header class="flex h-5 min-w-0 shrink-0 items-center gap-2">
    {#if Icon}
      <Icon aria-hidden="true" class={cn('shrink-0 text-primary', compact ? 'size-3.5' : 'size-4')} />
    {/if}
    <h3 id={titleId} class={cn('truncate', compact ? 'text-xs' : 'text-sm')}>{title}</h3>
    {#if meta}
      <span class="truncate text-xs text-muted-foreground">{meta}</span>
    {/if}
    {#if aside}
      <div class="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        {@render aside()}
      </div>
    {/if}
  </header>
  <div
    data-part="widget-content"
    class={cn('flex min-h-0 min-w-0 flex-col', !compact && 'flex-1')}
  >
    {@render children()}
  </div>
  {#if editing}
    <div
      data-part="widget-editing"
      class="absolute inset-0 flex items-start justify-end gap-1.5 rounded-xl bg-background/70 p-2 ring-2 ring-primary/40 ring-inset"
    >
      {@render editing()}
    </div>
  {/if}
</section>
