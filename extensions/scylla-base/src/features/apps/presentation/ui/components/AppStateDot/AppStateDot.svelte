<script lang="ts">
  import { cn } from '@scylla/ui/utils';
  import type { AppState } from '@base/features/apps/domain/entities/app.entity.ts';

  interface Props {
    state: AppState;
    class?: string;
  }

  let { state, class: className }: Props = $props();

  const TONE: Record<AppState, string> = {
    online: 'bg-success',
    offline: 'bg-muted-foreground',
    never: 'border border-dashed border-warning bg-transparent',
  };
</script>

<span
  class={cn('inline-block size-2 shrink-0 rounded-full', TONE[state], className)}
  aria-hidden="true"
></span>
