<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import type { LucideIcon } from '../../icon.ts';
  import { enter } from '../../motion/enter.ts';
  import { Button } from '../../primitives/index.ts';
  import { cn } from '../../utils/index.ts';
  import type { EmptyStateAction } from './empty-state.ts';

  interface Props {
    icon: LucideIcon;
    title: string;
    description?: string;
    /** Unset for a person who may not do it: an empty state shows no button that never works. */
    action?: EmptyStateAction;
    class?: string;
  }

  let { icon: Icon, title, description, action, class: className }: Props = $props();

  const ActionIcon = $derived(action?.icon ?? PlusIcon);
</script>

<!-- The title stays in its row: a long text or a button under it does not move it. -->
<section
  in:enter
  data-slot="empty-state"
  class={cn(
    'grid min-h-72 flex-1 grid-rows-[2fr_auto_3fr] justify-items-center gap-3 rounded-xl border p-8 text-center',
    className,
  )}
>
  <div class="row-start-2 flex flex-col items-center gap-3">
    <span
      class="flex size-12 items-center justify-center rounded-full bg-muted text-primary"
      aria-hidden="true"
    >
      <Icon class="size-5" />
    </span>
    <h2 class="text-xl">{title}</h2>
  </div>
  <div class="row-start-3 flex flex-col items-center gap-3">
    {#if description}
      <p class="max-w-md text-sm text-muted-foreground">{description}</p>
    {/if}
    {#if action}
      <Button onclick={action.onSelect} data-part="empty-state-action">
        <ActionIcon class="size-4" aria-hidden="true" />
        {action.label}
      </Button>
    {/if}
  </div>
</section>
