<script lang="ts">
  import type { LucideIcon } from '@scylla/ui';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    label: string;
    icon: LucideIcon;
    /** Only the icon, with the label in a tooltip and in `aria-label`. */
    compact: boolean;
    /** The icon also shows beside the label, not only when compact. */
    labeledIcon?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'default';
    class?: string;
    onclick: () => void;
  }

  let {
    label,
    icon: Icon,
    compact,
    labeledIcon = false,
    variant = 'default',
    size = 'sm',
    class: className,
    onclick,
  }: Props = $props();
</script>

{#if compact}
  <Tooltip delayDuration={200}>
    <TooltipTrigger>
      {#snippet child({ props })}
        <Button
          {...props}
          {variant}
          size={size === 'sm' ? 'icon-sm' : 'icon'}
          class={cn('shrink-0', className)}
          aria-label={label}
          data-compact="true"
          {onclick}
        >
          <Icon aria-hidden="true" />
        </Button>
      {/snippet}
    </TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
{:else}
  <Button {variant} {size} class={cn('min-w-0', className)} {onclick}>
    {#if labeledIcon}<Icon aria-hidden="true" />{/if}
    <span class="truncate">{label}</span>
  </Button>
{/if}
