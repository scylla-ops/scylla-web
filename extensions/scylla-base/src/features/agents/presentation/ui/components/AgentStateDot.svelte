<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { AgentState } from '@base/features/agents/domain/entities/agent.entity.ts';

  interface Props {
    state: AgentState;
    class?: string;
  }

  let { state, class: className }: Props = $props();

  const TONE: Record<AgentState, string> = {
    idle: 'bg-success',
    running: 'bg-info ring-[3px] ring-info/25',
    offline: 'bg-muted-foreground',
    never: 'border border-dashed border-warning bg-transparent',
    disabled: 'bg-destructive/70',
  };
</script>

<span
  class={cn('inline-block size-2 shrink-0 rounded-full', TONE[state], className)}
  aria-hidden="true"
></span>
