<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LucideIcon } from '@scylla/ui';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    icon: LucideIcon;
    tone: 'success' | 'destructive';
    title: string;
    body: string;
    /** The buttons, at the end of the line. */
    actions?: Snippet;
  }

  let { icon: Icon, tone, title, body, actions }: Props = $props();
</script>

<div
  role={tone === 'destructive' ? 'alert' : 'status'}
  class="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3"
>
  <Icon
    class={cn('size-4 shrink-0', tone === 'success' ? 'text-success' : 'text-destructive')}
    aria-hidden="true"
  />
  <div class="flex grow basis-64 flex-col gap-0.5">
    <p class={cn('text-sm font-medium', tone === 'destructive' && 'text-destructive')}>{title}</p>
    <p class="text-sm text-muted-foreground">{body}</p>
  </div>
  {#if actions}
    <div class="flex items-center gap-2">{@render actions()}</div>
  {/if}
</div>
