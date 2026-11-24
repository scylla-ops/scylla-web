<script lang="ts">
  import { Label } from '@scylla/ui/primitives';

  interface Props {
    id: string;
    label: string;
    value: string;
  }

  let { id, label, value = $bindable() }: Props = $props();
</script>

<!-- A text of a few lines, with the look of an input. -->
<div class="flex flex-col gap-1.5">
  <Label for={id}>{label}</Label>
  <textarea
    {id}
    rows="3"
    bind:value
    class="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
  ></textarea>
</div>
