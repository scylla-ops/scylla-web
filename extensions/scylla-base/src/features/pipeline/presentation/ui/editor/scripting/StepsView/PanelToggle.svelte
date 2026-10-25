<script lang="ts">
  import PanelLeftCloseIcon from '@lucide/svelte/icons/panel-left-close';
  import PanelLeftOpenIcon from '@lucide/svelte/icons/panel-left-open';
  import PanelRightCloseIcon from '@lucide/svelte/icons/panel-right-close';
  import PanelRightOpenIcon from '@lucide/svelte/icons/panel-right-open';
  import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import type { SidePanel } from './steps-view.state.svelte.ts';

  interface Props {
    panel: SidePanel;
    label: string;
    /** The side of the view the panel is on. */
    side: 'left' | 'right';
  }

  let { panel, label, side }: Props = $props();

  const Icon = $derived(
    side === 'left'
      ? panel.open
        ? PanelLeftCloseIcon
        : PanelLeftOpenIcon
      : panel.open
        ? PanelRightCloseIcon
        : PanelRightOpenIcon,
  );
</script>

<Tooltip>
  <TooltipTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-expanded={panel.open}
        onclick={panel.toggle}
      >
        <Icon class="size-4" />
      </Button>
    {/snippet}
  </TooltipTrigger>
  <TooltipContent>{label}</TooltipContent>
</Tooltip>
