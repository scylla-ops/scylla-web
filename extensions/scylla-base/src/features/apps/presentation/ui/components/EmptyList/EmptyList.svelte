<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import type { LucideIcon } from '@scylla/ui';
  import { Button } from '@scylla/ui/primitives';

  interface Props {
    icon: LucideIcon;
    title: string;
    body: string;
    addLabel: string;
    onAdd?: () => void;
  }

  let { icon: Icon, title, body, addLabel, onAdd }: Props = $props();
</script>

<section
  class="grid min-h-80 flex-1 grid-rows-[2fr_auto_3fr] justify-items-center gap-3 rounded-xl border p-8 text-center"
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
    <p class="max-w-md text-sm text-muted-foreground">{body}</p>
    {#if onAdd}
      <Button onclick={onAdd}>
        <PlusIcon class="size-4" aria-hidden="true" />
        {addLabel}
      </Button>
    {/if}
  </div>
</section>
