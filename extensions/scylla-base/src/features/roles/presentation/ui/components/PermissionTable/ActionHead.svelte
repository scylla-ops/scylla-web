<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { TableHead, Tooltip, TooltipContent, TooltipTrigger } from '@scylla/ui/primitives';
  import { clearColumn, selectColumn } from '../../../messages/roles.messages.ts';
  import { actionLabel, type Mark } from '../../../presenters/permission-table.presenter.ts';

  interface Props {
    action: string;
    /** Absent: the column has no cell to change. */
    mark?: Mark;
    onFlip: () => void;
    onHover: (on: boolean) => void;
  }

  let { action, mark, onFlip, onHover }: Props = $props();

  const label = $derived(actionLabel(action));
  const tip = $derived(t(mark === 'all' ? clearColumn(label) : selectColumn(label)));
</script>

<TableHead
  class="w-[72px] px-1 text-center"
  onpointerenter={() => onHover(mark !== undefined)}
  onpointerleave={() => onHover(false)}
  onfocusin={() => onHover(mark !== undefined)}
  onfocusout={() => onHover(false)}
>
  {#if mark}
    <Tooltip>
      <TooltipTrigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            aria-label={tip}
            class="rounded-md px-2 py-1 text-xs font-medium transition-colors outline-none hover:bg-foreground/7 hover:text-foreground focus-visible:bg-foreground/7 focus-visible:ring-2 focus-visible:ring-ring"
            onclick={onFlip}
          >
            {label}
          </button>
        {/snippet}
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  {:else}
    {label}
  {/if}
</TableHead>
