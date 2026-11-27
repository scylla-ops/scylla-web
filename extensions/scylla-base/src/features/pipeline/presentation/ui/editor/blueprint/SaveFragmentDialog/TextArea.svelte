<script lang="ts">
  import { Label, Textarea } from '@scylla/ui/primitives';

  interface Props {
    id: string;
    label: string;
    value: string;
  }

  let { id, label, value = $bindable() }: Props = $props();
</script>

<!-- A text that grows with its lines. -->
<div class="flex flex-col gap-1.5">
  <Label for={id}>{label}</Label>
  <Textarea {id} bind:value />
</div>
