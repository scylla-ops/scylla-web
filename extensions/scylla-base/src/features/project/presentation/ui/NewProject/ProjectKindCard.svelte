<script lang="ts">
  import type { Snippet } from 'svelte';
  import { buttonVariants } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';

  interface Props {
    href: string;
    title: string;
    body: string;
    action: string;
    icon: Snippet;
    /** False shows the card inert, with `deniedReason` under its action. */
    allowed?: boolean;
    deniedReason?: string;
    tour?: string;
  }

  let { href, title, body, action, icon, allowed = true, deniedReason, tour }: Props = $props();

  const id = $props.id();
</script>

{#snippet content()}
  <div class="flex flex-col items-center gap-4">
    <div
      class="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary-subtle group-focus-visible:bg-primary-subtle"
      aria-hidden="true"
    >
      {@render icon()}
    </div>
    <h2 class="text-lg">{title}</h2>
    <p id="{id}-body" class="text-sm text-muted-foreground">{body}</p>
  </div>
  <div class="flex w-full flex-col items-center gap-2">
    <span
      id="{id}-action"
      class={cn(
        buttonVariants({ variant: 'outline' }),
        'w-full',
        allowed &&
          'group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground hover:bg-primary hover:text-primary-foreground group-focus-visible:border-primary group-focus-visible:bg-primary group-focus-visible:text-primary-foreground',
      )}
    >
      {action}
    </span>
    {#if !allowed && deniedReason}
      <p id="{id}-denied" class="text-xs text-muted-foreground">{deniedReason}</p>
    {/if}
  </div>
{/snippet}

{#if allowed}
  <a
    {href}
    data-tour={tour}
    aria-labelledby="{id}-action"
    aria-describedby="{id}-body"
    class="group flex flex-1 flex-col items-center justify-between gap-8 rounded-xl border bg-card p-8 text-center transition-[background-color,border-color,box-shadow,scale] outline-none hover:border-primary hover:bg-primary/10 hover:shadow-lg focus-visible:border-primary focus-visible:bg-primary/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]"
  >
    {@render content()}
  </a>
{:else}
  <div
    role="group"
    aria-labelledby="{id}-action"
    aria-describedby="{id}-body {id}-denied"
    aria-disabled="true"
    class="flex flex-1 cursor-not-allowed flex-col items-center justify-between gap-8 rounded-xl border bg-card p-8 text-center opacity-60"
  >
    {@render content()}
  </div>
{/if}
